import os
import re
import json
import uuid
import time
import random
import requests
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI
import httpx
import openai

load_dotenv()

# CONFIGURATION
BASE_URL = "https://www.cylex-polska.pl"
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()  # MAIN / TEST
REQUIRE_AI = os.getenv("REQUIRE_AI", "true").lower() == "true"
USE_AI_REWRITE = (SCRAPER_MODE == "MAIN")

# AI Limits
MAX_AI_REQUESTS = int(os.getenv("MAX_AI_REQUESTS", "5000"))
AI_PAUSE_HOURS = int(os.getenv("AI_PAUSE_HOURS", "12"))
AI_RETRY_CHECK_SECONDS = int(os.getenv("AI_RETRY_CHECK_SECONDS", "3600"))
AI_MAX_RETRIES_PER_COMPANY = int(os.getenv("AI_MAX_RETRIES_PER_COMPANY", "8"))
AI_BACKOFF_INITIAL = float(os.getenv("AI_BACKOFF_INITIAL", "2"))
AI_BACKOFF_MAX = float(os.getenv("AI_BACKOFF_MAX", "60"))

MIN_RAW_DESC_FOR_DIRECT_USE = int(os.getenv("MIN_RAW_DESC_FOR_DIRECT_USE", "50"))
MIN_AI_DESC_LEN = int(os.getenv("MIN_AI_DESC_LEN", "400"))

# Runtime
ai_usage_counter = 0
client = None

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

REQUEST_DELAY_MIN = 1.0
REQUEST_DELAY_MAX = 2.5
MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "0"))  # 0 = bez limitu

def log(msg: str):
    print(msg, flush=True)

def connect_db():
    if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS]):
        raise RuntimeError("Brak DB creds w .env (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS)")
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASS
    )

def normalize_text(s: str) -> str:
    """Normalizacja tekstu"""
    s = (s or "").strip()
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def slugify(text: str) -> str:
    """Generuj slug z tekstu polskiego"""
    if not text:
        return ""
    text = text.lower().strip()
    replacements = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')[:60]

# =========================
# NORMALIZACJA WOJEWÓDZTW
# =========================
CANONICAL_VOIVODESHIPS = {
    "dolnośląskie",
    "kujawsko-pomorskie",
    "lubelskie",
    "lubuskie",
    "łódzkie",
    "małopolskie",
    "mazowieckie",
    "opolskie",
    "podkarpackie",
    "podlaskie",
    "pomorskie",
    "śląskie",
    "świętokrzyskie",
    "warmińsko-mazurskie",
    "wielkopolskie",
    "zachodniopomorskie",
}

def normalize_province(raw: str | None) -> str | None:
    """Normalizuje nazwę województwa do kanonicznej formy"""
    if not raw:
        return None
    s = raw.strip().lower()
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"\s+", "-", s)
    return s if s in CANONICAL_VOIVODESHIPS else None

def safe_request(session: requests.Session, url: str, max_retries: int = 3) -> requests.Response | None:
    """Bezpieczny request z retry"""
    for attempt in range(1, max_retries + 1):
        try:
            resp = session.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                return resp
            elif resp.status_code == 403:
                log(f"  ⚠️ HTTP 403 Forbidden on attempt {attempt}/{max_retries}")
                if attempt < max_retries:
                    time.sleep(random.uniform(5, 10))
                    continue
            else:
                log(f"  ⚠️ HTTP {resp.status_code} on attempt {attempt}/{max_retries}")
        except Exception as e:
            log(f"  ⚠️ Error on attempt {attempt}/{max_retries}: {e}")
        
        if attempt < max_retries:
            time.sleep(random.uniform(2, 5))
    
    return None

# =========================
# POZIOM 1 - KATEGORIE
# =========================
def scrape_categories():
    """Pobiera listę wszystkich tematów z głównej strony"""
    log("📋 Pobieranie kategorii z Cylex...")
    
    session = requests.Session()
    resp = safe_request(session, BASE_URL)
    
    if not resp:
        log("❌ Nie udało się pobrać głównej strony")
        return []
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    categories = []
    
    # Szukaj linków do tematów - pattern: /TEMAT.html
    for link in soup.select('a[href]'):
        href = link.get('href', '')
        
        # Interesują nas linki typu: /adwokaci.html, /agd.html
        # Ale nie linki do firm (/firmy/) ani inne specjalne strony
        if (href.startswith('/') and 
            href.endswith('.html') and 
            '/firmy/' not in href and
            href != '/index.html' and
            '?' not in href):
            
            full_url = BASE_URL + href
            name = normalize_text(link.get_text())
            
            # Filtruj tylko sensowne nazwy (min 2 znaki, nie puste)
            if name and len(name) > 2 and len(name) < 100:
                categories.append({
                    'url': full_url,
                    'name': name
                })
    
    # Deduplikacja po URL
    seen = set()
    unique_categories = []
    for cat in categories:
        if cat['url'] not in seen:
            seen.add(cat['url'])
            unique_categories.append(cat)
    
    log(f"✅ Znaleziono {len(unique_categories)} kategorii")
    return unique_categories

# =========================
# POZIOM 2 - LISTA FIRM
# =========================
def scrape_companies_from_category(session: requests.Session, category_url: str) -> list:
    """Pobiera listę firm z kategorii (wszystkie strony)"""
    results = []
    seen_urls = set()
    page_num = 1
    
    while True:
        if MAX_PAGES_PER_CATEGORY > 0 and page_num > MAX_PAGES_PER_CATEGORY:
            break
        
        # URL z paginacją
        if page_num == 1:
            url = category_url
        else:
            # Sprawdź czy URL już ma parametr page
            if '?' in category_url:
                url = f"{category_url}&page={page_num}"
            else:
                url = f"{category_url}?page={page_num}"
        
        log(f"  📄 Strona {page_num}: {url}")
        
        resp = safe_request(session, url)
        if not resp:
            log(f"  ⚠️ Nie udało się pobrać strony {page_num}")
            break
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Szukaj linków do firm - pattern: /firmy/NAZWA-ID.html
        company_links = []
        for link in soup.select('a[href*="/firmy/"]'):
            href = link.get('href', '')
            if href.endswith('.html') and '/firmy/' in href:
                company_links.append(href)
        
        if not company_links:
            log(f"  ℹ️ Brak firm na stronie {page_num}")
            # Sprawdź czy to ostatnia strona (może być komunikat o braku wyników)
            if page_num > 1:
                break
            # Na pierwszej stronie sprawdź czy są jakieś linki w ogóle
            all_links = soup.select('a[href]')
            if len(all_links) < 5:  # Bardzo mało linków = prawdopodobnie pusta strona
                break
        
        # Zbierz unikalne linki
        new_count = 0
        for href in company_links:
            # Normalizuj URL
            if href.startswith('/'):
                full_url = BASE_URL + href
            elif href.startswith('http'):
                full_url = href
            else:
                continue
            
            if full_url not in seen_urls:
                seen_urls.add(full_url)
                results.append(full_url)
                new_count += 1
        
        log(f"  ✅ Znaleziono {new_count} nowych firm (total: {len(results)})")
        
        if new_count == 0:
            break
        
        page_num += 1
        time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
    
    return results

# =========================
# POZIOM 3 - SZCZEGÓŁY FIRMY
# =========================
def scrape_company_details(session: requests.Session, company_url: str) -> dict | None:
    """Pobiera szczegóły firmy"""
    
    resp = safe_request(session, company_url)
    if not resp:
        return None
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    details = {
        'source_url': company_url,
        'name': None,
        'address': None,
        'city': None,
        'province': None,  # Województwo
        'postal_code': None,
        'phone': None,
        'email': None,
        'website': None,
        'description': None,
        'category': None,
        'nip': None,
        'lat': None,
        'lng': None,
    }
    
    # NAZWA - zazwyczaj w <h1> lub <h2>
    name_selectors = [
        'h1',
        'h2[class*="company"]',
        '.company-name',
        '[itemprop="name"]',
        '.name',
        'h2'
    ]
    for selector in name_selectors:
        name_elem = soup.select_one(selector)
        if name_elem:
            name_text = normalize_text(name_elem.get_text())
            if name_text and len(name_text) > 2:
                details['name'] = name_text
                break
    
    # ADRES - szukaj elementów zawierających adres
    address_selectors = [
        '[itemprop="streetAddress"]',
        '[itemprop="address"]',
        '.address',
        '[class*="address"]',
        '[class*="street"]'
    ]
    for selector in address_selectors:
        address_elem = soup.select_one(selector)
        if address_elem:
            address_text = normalize_text(address_elem.get_text())
            if address_text and len(address_text) > 3:
                details['address'] = address_text
                break
    
    # MIASTO - z adresu lub osobnego elementu
    city_selectors = [
        '[itemprop="addressLocality"]',
        '.city',
        '[class*="city"]'
    ]
    for selector in city_selectors:
        city_elem = soup.select_one(selector)
        if city_elem:
            city_text = normalize_text(city_elem.get_text())
            if city_text:
                details['city'] = city_text
                break
    
    # Jeśli nie znaleziono miasta, spróbuj wyciągnąć z adresu
    if not details['city'] and details['address']:
        # Często format: "ulica, kod miasto"
        parts = details['address'].split(',')
        if len(parts) >= 2:
            last_part = parts[-1].strip()
            # Sprawdź czy ostatnia część to kod pocztowy + miasto
            postal_match = re.search(r'(\d{2}-\d{3})\s+(.+)', last_part)
            if postal_match:
                details['postal_code'] = postal_match.group(1)
                details['city'] = postal_match.group(2)
            else:
                # Może być samo miasto
                details['city'] = last_part
    
    # KOD POCZTOWY
    postal_selectors = [
        '[itemprop="postalCode"]',
        '.postal-code',
        '[class*="postal"]'
    ]
    for selector in postal_selectors:
        postal_elem = soup.select_one(selector)
        if postal_elem:
            postal_text = normalize_text(postal_elem.get_text())
            # Wyciągnij tylko kod (format: XX-XXX)
            postal_match = re.search(r'(\d{2}-\d{3})', postal_text)
            if postal_match:
                details['postal_code'] = postal_match.group(1)
                break
    
    # TELEFON
    phone_selectors = [
        '[itemprop="telephone"]',
        '.phone',
        '[href^="tel:"]',
        '[class*="phone"]'
    ]
    for selector in phone_selectors:
        phone_elem = soup.select_one(selector)
        if phone_elem:
            phone = phone_elem.get('href', '') if phone_elem.name == 'a' else phone_elem.get_text()
            phone = normalize_text(phone.replace('tel:', ''))
            # Usuń wszystko oprócz cyfr, +, spacji, myślników, nawiasów
            phone = re.sub(r'[^\d\s+()-]', '', phone)
            phone = re.sub(r'\s+', ' ', phone).strip()
            if phone and len(phone) >= 7:  # Minimum 7 znaków dla numeru
                details['phone'] = phone
                break
    
    # EMAIL
    email_selectors = [
        '[itemprop="email"]',
        '[href^="mailto:"]',
        '.email',
        '[class*="email"]'
    ]
    for selector in email_selectors:
        email_elem = soup.select_one(selector)
        if email_elem:
            email = email_elem.get('href', '') if email_elem.name == 'a' else email_elem.get_text()
            email = normalize_text(email.replace('mailto:', ''))
            if '@' in email:
                # Wyciągnij tylko część przed @ i domenę
                email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', email)
                if email_match:
                    details['email'] = email_match.group(1)
                    break
    
    # WEBSITE
    website_selectors = [
        '[itemprop="url"]',
        '.website',
        'a[rel="nofollow"][target="_blank"]',
        'a[target="_blank"][href^="http"]'
    ]
    for selector in website_selectors:
        website_elem = soup.select_one(selector)
        if website_elem:
            website = website_elem.get('href', '')
            if website and website.startswith('http'):
                # Pomiń linki do social media i innych serwisów
                skip_domains = ['facebook.com', 'twitter.com', 'instagram.com', 
                               'linkedin.com', 'youtube.com', 'cylex-polska.pl']
                if not any(domain in website.lower() for domain in skip_domains):
                    details['website'] = website
                    break
    
    # OPIS
    desc_selectors = [
        '[itemprop="description"]',
        '.description',
        '.company-description',
        '[class*="description"]',
        '[class*="about"]'
    ]
    for selector in desc_selectors:
        desc_elem = soup.select_one(selector)
        if desc_elem:
            desc_text = normalize_text(desc_elem.get_text())
            if desc_text and len(desc_text) > 20:  # Minimum 20 znaków dla opisu
                details['description'] = desc_text
                break
    
    # KATEGORIA
    category_selectors = [
        '.category',
        '[class*="category"]',
        '[itemprop="category"]',
        '.breadcrumb a'
    ]
    for selector in category_selectors:
        category_elem = soup.select_one(selector)
        if category_elem:
            category_text = normalize_text(category_elem.get_text())
            if category_text and len(category_text) > 2:
                details['category'] = category_text
                break
    
    # WOJEWÓDZTWO (PROVINCE)
    province_selectors = [
        '[itemprop="addressRegion"]',
        '.province',
        '[class*="province"]',
        '[class*="województwo"]',
        '[class*="voivodeship"]'
    ]
    province_raw = None
    for selector in province_selectors:
        province_elem = soup.select_one(selector)
        if province_elem:
            province_text = normalize_text(province_elem.get_text())
            if province_text:
                province_raw = province_text
                break
    
    # Jeśli nie znaleziono województwa, spróbuj wyciągnąć z adresu
    if not province_raw and details['address']:
        # Często w adresie jest format: "miasto, województwo"
        address_parts = details['address'].split(',')
        for part in address_parts:
            part = part.strip()
            # Sprawdź czy część zawiera nazwę województwa
            for voiv in CANONICAL_VOIVODESHIPS:
                if voiv.lower() in part.lower():
                    province_raw = part
                    break
            if province_raw:
                break
    
    # Normalizuj województwo do kanonicznej formy
    if province_raw:
        details['province'] = normalize_province(province_raw)
    
    # WSPÓŁRZĘDNE GEOGRAFICZNE (lat, lng)
    # Szukaj w itemprop="geo" lub data-* attributes
    geo_elem = soup.select_one('[itemprop="geo"]')
    if geo_elem:
        lat_elem = geo_elem.select_one('[itemprop="latitude"]')
        lng_elem = geo_elem.select_one('[itemprop="longitude"]')
        if lat_elem:
            try:
                lat = float(normalize_text(lat_elem.get_text()).replace(',', '.'))
                details['lat'] = lat
            except:
                pass
        if lng_elem:
            try:
                lng = float(normalize_text(lng_elem.get_text()).replace(',', '.'))
                details['lng'] = lng
            except:
                pass
    
    # Alternatywnie szukaj w data-* attributes lub script tags
    if not details['lat'] or not details['lng']:
        # Szukaj w data attributes
        for elem in soup.select('[data-lat], [data-lng], [data-latitude], [data-longitude]'):
            if elem.get('data-lat') or elem.get('data-latitude'):
                try:
                    lat = float(elem.get('data-lat') or elem.get('data-latitude'))
                    details['lat'] = lat
                except:
                    pass
            if elem.get('data-lng') or elem.get('data-longitude'):
                try:
                    lng = float(elem.get('data-lng') or elem.get('data-longitude'))
                    details['lng'] = lng
                except:
                    pass
        
        # Szukaj w script tags (często są tam współrzędne)
        for script in soup.select('script'):
            if script.string:
                # Szukaj wzorców typu: lat: 52.2297, lng: 21.0122
                lat_match = re.search(r'lat[itude]*["\']?\s*[:=]\s*([\d.]+)', script.string, re.IGNORECASE)
                lng_match = re.search(r'lng|lon[gitude]*["\']?\s*[:=]\s*([\d.]+)', script.string, re.IGNORECASE)
                if lat_match:
                    try:
                        details['lat'] = float(lat_match.group(1))
                    except:
                        pass
                if lng_match:
                    try:
                        details['lng'] = float(lng_match.group(1))
                    except:
                        pass
    
    # NIP - szukaj w tekście strony
    text = soup.get_text()
    # Różne wzorce NIP
    nip_patterns = [
        r'NIP[:\s]*(\d{10})',
        r'NIP[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})',
    ]
    for pattern in nip_patterns:
        nip_match = re.search(pattern, text, re.IGNORECASE)
        if nip_match:
            # Usuń wszystko oprócz cyfr - format: 5551908790 (bez myślników)
            nip = re.sub(r'\D', '', nip_match.group(1))
            if len(nip) == 10:
                details['nip'] = nip
                break
    
    # Fallback - szukaj 10 cyfr pod rząd (ale tylko jeśli w kontekście NIP)
    if not details['nip']:
        # Szukaj wzorca: NIP lub numer identyfikacyjny + 10 cyfr
        nip_context_match = re.search(r'(?:NIP|numer\s+identyfikacyjny)[:\s]*(\d{10})', text, re.IGNORECASE)
        if nip_context_match:
            nip = nip_context_match.group(1)
            if len(nip) == 10:
                details['nip'] = nip
    
    # Jeśli nie znaleziono nazwy, nie zwracaj danych
    if not details['name']:
        return None
    
    return details

# =========================
# OPENAI - GENEROWANIE OPISU
# =========================
def ensure_openai_available_forever():
    """
    Jeśli REQUIRE_AI=true, to bez klucza albo przy problemach z inicjalizacją
    nie kończymy procesu - śpimy i próbujemy ponownie co godzinę.
    """
    global client

    if not hasattr(ensure_openai_available_forever, '_version_logged'):
        try:
            openai_version = getattr(openai, '__version__', 'unknown')
            log(f"📦 OpenAI version: {openai_version}")
            ensure_openai_available_forever._version_logged = True
        except:
            pass

    while True:
        if not OPENAI_API_KEY:
            if REQUIRE_AI:
                log(f"❌ Brak OPENAI_API_KEY. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                time.sleep(AI_RETRY_CHECK_SECONDS)
                continue
            return False

        if client is None:
            try:
                # Sprawdź czy są zmienne środowiskowe z proxy
                proxy_vars = [k for k in os.environ.keys() if 'proxy' in k.lower()]
                if proxy_vars:
                    log(f"⚠️ Wykryto zmienne środowiskowe z proxy: {proxy_vars}")
                    log(f"⚠️ Będziemy je ignorować używając trust_env=False")
                
                log(f"Inicjalizacja klienta OpenAI...")
                
                # Używamy trust_env=False aby ignorować proxy
                http_client = httpx.Client(
                    timeout=60.0,
                    trust_env=False  # Ignoruje zmienne środowiskowe HTTP_PROXY, HTTPS_PROXY, etc.
                )
                
                client = OpenAI(
                    api_key=OPENAI_API_KEY,
                    http_client=http_client
                )
                
                log(f"✅ Klient OpenAI zainicjalizowany pomyślnie")
                return True
                
            except Exception as e:
                log(f"❌ OpenAI init error: {e}")
                
                if REQUIRE_AI:
                    log(f"⚠️ REQUIRE_AI=true, ale nie można zainicjalizować klienta. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                    time.sleep(AI_RETRY_CHECK_SECONDS)
                    continue
                return False

        return True


def rewrite_description_with_ai_strict(source_text: str, company_name: str, category_name: str, city: str | None) -> str:
    """Generuje opis firmy używając OpenAI z tym samym promptem co scraper PanoramaFirm"""
    global ai_usage_counter

    if not USE_AI_REWRITE:
        raise RuntimeError("AI disabled (SCRAPER_MODE!=MAIN)")

    ensure_openai_available_forever()

    prompt = f"""
Napisz unikalny opis firmy do katalogu lokalnych usług.

JĘZYK I FORMA:
- Język: polski.
- Zwróć WYŁĄCZNIE gotowy opis jako PLAIN TEXT.
- Format: 5–7 krótkich akapitów; między akapitami ZAWSZE jedna pusta linia (podwójny enter).
- Bez list punktowanych i numerowanych.
- Bez nagłówków typu „O firmie" i bez emoji.
- Nie kończ CTA typu „zapraszamy do kontaktu".

DŁUGOŚĆ:
- 900–1400 znaków (ze spacjami).

SEO (naturalnie):
- W pierwszym akapicie użyj: {company_name}, {category_name} + 1–2 fraz pokrewnych.
- Użyj synonimów i odmian; bez sztucznego powtarzania.

UWAGA:
- Jeśli źródło jest ubogie, uzupełnij opis na podstawie nazwy i kategorii, ale nie wymyślaj konkretnych faktów.

MATERIAŁ ŹRÓDŁOWY (nie kopiuj dosłownie):
{source_text[:1400]}

Wygeneruj wyłącznie opis.
""".strip()

    delay = AI_BACKOFF_INITIAL
    for attempt in range(1, AI_MAX_RETRIES_PER_COMPANY + 1):
        try:
            if ai_usage_counter >= MAX_AI_REQUESTS:
                log(f"Limit AI ({MAX_AI_REQUESTS}) osiągnięty. Pauza {AI_PAUSE_HOURS}h...")
                time.sleep(AI_PAUSE_HOURS * 3600)
                ai_usage_counter = 0

            resp = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Jesteś doświadczonym copywriterem SEO. Pisz po polsku."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=700,
                temperature=0.7,
            )

            ai_usage_counter += 1
            text = (resp.choices[0].message.content or "").strip()

            if len(text) < MIN_AI_DESC_LEN:
                raise RuntimeError(f"AI returned too short text ({len(text)})")

            return text

        except Exception as e:
            log(f"AI error attempt {attempt}/{AI_MAX_RETRIES_PER_COMPANY}: {e}")
            time.sleep(min(delay, AI_BACKOFF_MAX) + random.uniform(0, 1.0))
            delay *= 2

    log(f"AI seems down. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
    time.sleep(AI_RETRY_CHECK_SECONDS)
    raise RuntimeError("AI unavailable after retries + cooldown")

# =========================
# ZAPIS DO BAZY
# =========================
def get_or_create_tenant(conn, subdomain: str) -> str:
    """Pobiera lub tworzy tenant"""
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Tenant" WHERE subdomain = %s', (subdomain,))
    row = cur.fetchone()
    
    if row:
        tenant_id = row[0]
    else:
        tenant_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO "Tenant" (id, name, subdomain, "createdAt") VALUES (%s, %s, %s, NOW())',
            (tenant_id, "Katalog Firm", subdomain)
        )
        conn.commit()
    
    cur.close()
    return tenant_id

def get_or_create_category(conn, tenant_id: str, name: str) -> str:
    """Pobiera lub tworzy kategorię"""
    name = name or "Inne"
    slug = slugify(name)
    
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Category" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
    row = cur.fetchone()
    
    if row:
        cat_id = row[0]
    else:
        cat_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO "Category" (id, name, slug, "tenantId") VALUES (%s, %s, %s, %s)',
            (cat_id, name, slug, tenant_id)
        )
        conn.commit()
    
    cur.close()
    return cat_id

def company_exists(conn, source_url: str, nip: str | None = None) -> tuple[bool, str]:
    """
    Sprawdza czy firma już istnieje po sourceUrl lub NIP.
    Zwraca tuple: (czy istnieje, powód - 'sourceUrl' lub 'nip' lub None)
    """
    cur = conn.cursor()
    
    # Sprawdź po sourceUrl
    cur.execute('SELECT 1 FROM "Company" WHERE "sourceUrl" = %s LIMIT 1', (source_url,))
    if cur.fetchone():
        cur.close()
        return (True, 'sourceUrl')
    
    # Sprawdź po NIP (jeśli jest dostępny)
    if nip and nip.strip():
        cur.execute('SELECT 1 FROM "Company" WHERE nip = %s AND nip IS NOT NULL LIMIT 1', (nip.strip(),))
        if cur.fetchone():
            cur.close()
            return (True, 'nip')
    
    cur.close()
    return (False, None)

def get_unique_slug(conn, tenant_id: str, name: str) -> str:
    """Generuje unikalny slug"""
    base_slug = slugify(name) or "firma"
    slug = base_slug
    counter = 1
    
    cur = conn.cursor()
    while True:
        cur.execute('SELECT 1 FROM "Company" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
        if not cur.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    cur.close()
    
    return slug

def save_company_to_db(conn, company_data: dict, category_name: str) -> bool:
    """Zapisuje firmę do bazy danych"""
    global ai_usage_counter
    
    # 1. Tenant
    tenant_id = get_or_create_tenant(conn, "katalog")
    
    # 2. Category
    category_id = get_or_create_category(conn, tenant_id, category_name)
    
    # 3. Sprawdź czy firma już istnieje (po sourceUrl lub NIP)
    exists, reason = company_exists(conn, company_data['source_url'], company_data.get('nip'))
    if exists:
        if reason == 'nip':
            log(f"      ℹ️ Firma już istnieje w bazie (NIP: {company_data.get('nip')})")
        else:
            log(f"      ℹ️ Firma już istnieje w bazie (sourceUrl)")
        return False
    
    # 4. Slug
    slug = get_unique_slug(conn, tenant_id, company_data['name'])
    
    # 5. Opis - MUSI być wygenerowany przez AI jeśli USE_AI_REWRITE=true
    description = None
    raw_desc = company_data.get('description') or ""
    
    if USE_AI_REWRITE:
        # Przygotuj tekst źródłowy
        if len(raw_desc.strip()) < MIN_RAW_DESC_FOR_DIRECT_USE:
            source_text = f"Firma: {company_data['name']}. Kategoria: {category_name}. Lokalizacja: {company_data.get('city') or 'Polska'}."
        else:
            source_text = raw_desc
        
        log(f"      🤖 Generowanie opisu przez AI (WYMAGANE)...")
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                if REQUIRE_AI and not OPENAI_API_KEY:
                    log(f"      ⚠️ REQUIRE_AI=true, ale brak OPENAI_API_KEY. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                    time.sleep(AI_RETRY_CHECK_SECONDS)
                    retry_count += 1
                    continue

                description = rewrite_description_with_ai_strict(
                    source_text=source_text,
                    company_name=company_data['name'],
                    category_name=category_name,
                    city=company_data.get('city'),
                )
                
                if description and len(description.strip()) >= MIN_AI_DESC_LEN:
                    log(f"      ✅ Opis wygenerowany przez AI ({len(description)} znaków)")
                    break
                else:
                    raise RuntimeError(f"AI zwróciło zbyt krótki opis ({len(description or '')} znaków)")
                    
            except Exception as e:
                retry_count += 1
                log(f"      ⚠️ AI error (próba {retry_count}/{max_retries}): {e}")
                if retry_count >= max_retries:
                    log(f"      ❌ Nie udało się wygenerować opisu przez AI - POMIJAM firmę")
                    return False  # NIE dodawaj firmy bez opisu z AI
                time.sleep(2)
        
        # Jeśli nie udało się wygenerować opisu, nie dodawaj firmy
        if not description or len(description.strip()) < MIN_AI_DESC_LEN:
            log(f"      ❌ Brak poprawnego opisu z AI - POMIJAM firmę")
            return False
    else:
        # Tryb bez AI - użyj surowego opisu (jeśli dostępny)
        description = raw_desc if len(raw_desc.strip()) >= MIN_RAW_DESC_FOR_DIRECT_USE else None
        log(f"      ℹ️ Tryb bez AI: opis={'dostępny' if description else 'brak'}")
    
    # 6. Insert
    company_id = str(uuid.uuid4())
    
    cur = conn.cursor()
    try:
        cur.execute('''
            INSERT INTO "Company" (
                id, name, slug, address, city, province, "postalCode", phone, email, website,
                description, "categoryId", "tenantId", "sourceUrl", nip, lat, lng, "isVerified",
                "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s,
                NOW(), NOW()
            )
            ON CONFLICT ("sourceUrl") DO NOTHING
            RETURNING id
        ''', (
            company_id, company_data['name'], slug, company_data['address'],
            company_data['city'], company_data.get('province'), company_data['postal_code'], 
            company_data['phone'], company_data['email'], company_data['website'], 
            description,  # Użyj description (może być z AI)
            category_id, tenant_id, company_data['source_url'], company_data['nip'],
            company_data.get('lat'), company_data.get('lng'), False
        ))
        
        row = cur.fetchone()
        conn.commit()
        
        if row:
            return True
        else:
            # Konflikt - firma już istnieje
            return False
    except Exception as e:
        log(f"      ❌ Błąd SQL: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()

# =========================
# MAIN
# =========================
def main():
    log("🚀 Start scrapowania Cylex")
    log(
        f"Mode={SCRAPER_MODE} | REQUIRE_AI={'YES' if REQUIRE_AI else 'NO'} | "
        f"MAX_PAGES_PER_CATEGORY={MAX_PAGES_PER_CATEGORY} | AI_MODEL={OPENAI_MODEL}"
    )
    
    conn = connect_db()
    session = requests.Session()
    
    # KROK 1: Pobierz kategorie
    categories = scrape_categories()
    
    if not categories:
        log("❌ Brak kategorii do przetworzenia")
        conn.close()
        return
    
    log(f"📋 Znaleziono {len(categories)} kategorii")
    
    total_inserted = 0
    
    # KROK 2: Dla każdej kategorii
    for idx, category in enumerate(categories, 1):
        log(f"\n[{idx}/{len(categories)}] Kategoria: {category['name']}")
        log(f"  URL: {category['url']}")
        
        # Pobierz listę firm
        company_urls = scrape_companies_from_category(session, category['url'])
        
        log(f"  📊 Znaleziono {len(company_urls)} firm")
        
        if not company_urls:
            log(f"  ⚠️ Brak firm w kategorii, pomijam")
            continue
        
        # KROK 3: Dla każdej firmy
        for company_idx, company_url in enumerate(company_urls, 1):
            log(f"    [{company_idx}/{len(company_urls)}] {company_url}")
            
            # Pobierz szczegóły
            details = scrape_company_details(session, company_url)
            
            if not details:
                log(f"      ⚠️ Brak szczegółów")
                time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
                continue
            
            log(f"      ✓ {details['name']}")
            
            # Zapisz do bazy
            try:
                if save_company_to_db(conn, details, category['name']):
                    total_inserted += 1
                    log(f"      ✅ Zapisano do bazy (total: {total_inserted})")
                # Informacja o pominięciu jest już w save_company_to_db()
            except Exception as e:
                log(f"      ❌ Błąd zapisu: {e}")
                import traceback
                log(f"      Traceback: {traceback.format_exc()}")
            
            # Delay między firmami
            time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
        
        # Delay między kategoriami
        if idx < len(categories):
            delay = random.uniform(3, 6)
            log(f"  ⏸️  Przerwa {delay:.1f}s przed następną kategorią...")
            time.sleep(delay)
    
    conn.close()
    log(f"\n🎉 Zakończono! Dodano {total_inserted} firm | AI użyto: {ai_usage_counter} razy")

if __name__ == "__main__":
    main()
