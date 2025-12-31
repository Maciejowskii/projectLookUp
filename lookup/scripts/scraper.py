import requests
from bs4 import BeautifulSoup
import psycopg2
import time
import json
import uuid
import re
import os
import random
import warnings
from dotenv import load_dotenv
import openai
from openai import OpenAI

# Ignorowanie ostrzeżenia o deprecjacji
warnings.simplefilter(action='ignore', category=FutureWarning)

# 1. Ładujemy zmienne z pliku .env
load_dotenv()

# 2. Konfiguracja
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()  # MAIN | RAW
SCRAPE_ALL_CATEGORIES = os.getenv("SCRAPE_ALL_CATEGORIES", "false").upper() == "TRUE"
USE_AI_REWRITE = SCRAPER_MODE == "MAIN" and bool(OPENAI_API_KEY)

# NOWE: Limit firm ogółem
MAX_TOTAL_COMPANIES = int(os.getenv("MAX_TOTAL_COMPANIES", "10000"))  # NOWE!

# Konfiguracja bazy
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

# Limity
MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "5"))
MAX_CATEGORIES = int(os.getenv("MAX_CATEGORIES", "10"))
MAX_AI_REQUESTS = int(os.getenv("MAX_AI_REQUESTS", "5000"))

# Liczniki globalne
ai_usage_counter = 0
total_companies_processed = 0  # NOWE!

client = None

print(f"🟢 Tryb: {SCRAPER_MODE} | Kategorie: {'AUTO + POPULARNE' if SCRAPE_ALL_CATEGORIES else 'TYLKO POPULARNE'} | AI: {'✓' if USE_AI_REWRITE else '✗'}")
print(f"📉 Limit AI: {MAX_AI_REQUESTS} zapytań | Limit firm: {MAX_TOTAL_COMPANIES:,}")

def init_openai():
    global client
    if client: return True
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        return True
    except Exception as e:
        print(f"⚠️ OpenAI niedostępne: {e}")
        global USE_AI_REWRITE
        USE_AI_REWRITE = False
        return False

# ===== KONFIGURACJA HTTP =====
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
}
BASE_URL = "https://panoramafirm.pl"

TENANT_MAP = {
    "mechanicy": ["mechanik", "auto", "samochod", "pojazd", "wulkanizacja", "opony", "lakiernia", "warsztat"],
    "ksiegowi": ["księg", "rachunk", "biuro rachunkowe", "podatk", "audyt", "finans"],
    "budowlanka": ["budow", "remont", "wykończe", "hydraul", "elektryk", "dach", "okna", "drzwi"],
    "lekarze": ["lekarz", "medyc", "przychodnia", "stomatolog", "dentysta", "rehabilitacja"],
    "fryzjerzy": ["fryzjer", "kosmetyk", "salon urody", "spa"],
    "prawnicy": ["adwokat", "prawnik", "notariusz", "radca prawny"],
    "transport": ["transport", "przewóz", "spedycja", "logistyka", "kurier"],
    "serwis_agd": ["agd", "pralka", "lodówka", "zmywarka", "naprawa", "serwis"]
}
DEFAULT_TENANT_SUBDOMAIN = "katalog"

def connect_db():
    if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS]):
        print("❌ .env: brak DB_HOST, DB_PORT, DB_NAME, DB_USER lub DB_PASS")
        exit(1)
    try:
        return psycopg2.connect(
            host=DB_HOST, port=DB_PORT, 
            database=DB_NAME, user=DB_USER, password=DB_PASS
        )
    except Exception as e:
        print(f"❌ Baza: {e}")
        exit(1)

def slugify(text):
    if not text: return ""
    text = text.lower()
    replacements = {'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'}
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')[:50]

def company_exists(conn, slug):
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM "Company" WHERE slug = %s', (slug,))
    exists = cur.fetchone()
    cur.close()
    return True if exists else False

def get_tenant_id_by_category(conn, category_name):
    cat_lower = category_name.lower()
    target_subdomain = DEFAULT_TENANT_SUBDOMAIN
    for subdomain, keywords in TENANT_MAP.items():
        if any(kw in cat_lower for kw in keywords):
            target_subdomain = subdomain
            break
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Tenant" WHERE subdomain = %s', (target_subdomain,))
    row = cur.fetchone()
    if row:
        tenant_id = row[0]
    else:
        tenant_id = str(uuid.uuid4())
        name = "Katalog Firm" if target_subdomain == "katalog" else f"Katalog {target_subdomain.capitalize()}"
        cur.execute('INSERT INTO "Tenant" (id, name, subdomain, "createdAt") VALUES (%s, %s, %s, NOW())', 
                    (tenant_id, name, target_subdomain))
        conn.commit()
    cur.close()
    return tenant_id, target_subdomain

def get_or_create_category(conn, tenant_id, name):
    slug = slugify(name)
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Category" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
    row = cur.fetchone()
    if row:
        cat_id = row[0]
    else:
        cat_id = str(uuid.uuid4())
        cur.execute('INSERT INTO "Category" (id, name, slug, "tenantId") VALUES (%s, %s, %s, %s)', 
                    (cat_id, name, slug, tenant_id))
        conn.commit()
    cur.close()
    return cat_id

def extract_company_variable(html_content):
    start_marker = "var company ="
    start_idx = html_content.find(start_marker)
    if start_idx == -1: return None
    json_start = html_content.find("{", start_idx)
    if json_start == -1: return None
    bracket_count = 0
    in_string = False
    escape = False
    for i in range(json_start, len(html_content)):
        char = html_content[i]
        if char == '"' and not escape: in_string = not in_string
        if not in_string:
            if char == '{': bracket_count += 1
            elif char == '}':
                bracket_count -= 1
                if bracket_count == 0:
                    try: return json.loads(html_content[json_start:i+1])
                    except: return None
        if char == '\\' and not escape: escape = True
        else: escape = False
    return None

def clean_html_text(html_text):
    if not html_text: return ""
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(separator="\n").strip()

def scrape_all_categories():
    categories = []
    
    # 1. ZAWSZE dodaj popularne
    popular = [
        "https://panoramafirm.pl/serwis_agd",
        "https://panoramafirm.pl/biura_rachunkowe", 
        "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie",
        "https://panoramafirm.pl/salony_i_gabinety_kosmetyczne",
        "https://panoramafirm.pl/warsztaty_samochodowe",
        "https://panoramafirm.pl/mechanicy",
        "https://panoramafirm.pl/hydraulicy",
        "https://panoramafirm.pl/elektrycy",
        "https://panoramafirm.pl/adwokaci"
    ]
    for url in popular:
        categories.append({"name": os.path.basename(url.rstrip("/")).replace("_", " ").title(), "url": url})
        
    # 2. Jeśli włączono AUTO scrapowanie, dobierz resztę
    if SCRAPE_ALL_CATEGORIES:
        print("🔍 Pobieram dodatkowe kategorie z A-Z...")
        try:
            resp = requests.get("https://panoramafirm.pl/biuro", headers=HEADERS, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            
            for link in soup.select("a.dropdown-item[href*='/branze.html']"):
                href = link.get("href", "")
                title = link.get_text(strip=True)
                if href and title:
                    categories.append({"name": title, "url": f"{BASE_URL}{href.replace('/branze.html', '')}"})
            
            for link in soup.select("a[href^='/'][href$='/']"):
                href = link.get("href", "").rstrip("/")
                title = link.get_text(strip=True)
                if href and len(href) > 3 and title and any(kw in href for kw in ['serwis_', 'meble_', 'ksero']):
                    categories.append({"name": title.replace("_", " ").title(), "url": f"{BASE_URL}{href}"})
                    
        except Exception as e:
            print(f"⚠️ Błąd pobierania kategorii A-Z: {e}")

    # Usuń duplikaty
    seen = set()
    unique = []
    for cat in categories:
        if cat['url'] not in seen:
            seen.add(cat['url'])
            unique.append(cat)
    
    if SCRAPE_ALL_CATEGORIES:
        return unique[:MAX_CATEGORIES]
    else:
        return unique

def scrape_category_listing(listing_url, pages=1):
    pages = min(pages, MAX_PAGES_PER_CATEGORY)
    results = []
    category_name = os.path.basename(listing_url.rstrip('/')).replace("_", " ").title()
    session = requests.Session()
    session.headers.update(HEADERS)
    
    for page in range(1, pages + 1):
        url = f"{listing_url}/firmy,{page}.html" if page > 1 else listing_url
        print(f"   📄 Strona {page}: {url}")
        try:
            resp = session.get(url, timeout=15)
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.select("h2 a.company-name, a.company-name"):
                href = link.get('href')
                name = link.get_text(strip=True)
                if href and name:
                    results.append({"name": name, "url": href, "category_name": category_name})
        except Exception as e: print(f"   ⚠️ {e}")
        time.sleep(random.uniform(1, 2))
    
    seen = set()
    return [r for r in results if r['url'] not in seen and not seen.add(r['url'])]

def rewrite_description_with_ai(original_text, company_name, city):
    global ai_usage_counter
    if ai_usage_counter >= MAX_AI_REQUESTS: 
        print("🛑 Limit AI osiągnięty!")
        return None
    
    prompt = f"""Twoim zadaniem jest przerobić poniższy opis firmy tak, aby:

            1.⁠ ⁠Długość tekstu: 700–1200 znaków.
            2.⁠ ⁠Treść: unikalna, naturalna, nie kopiująca słowo w słowo.
            3.⁠ ⁠SEO: zoptymalizowana pod frazy kluczowe podane poniżej, w sposób naturalny i nienachalny.
            4.⁠ ⁠Ton: profesjonalny, informacyjny, przyjazny, bez marketingowego bełkotu.
            5.⁠ ⁠Struktura: jeden spójny akapit, brak list punktowanych, brak powtórzeń powyżej 2 razy tej samej frazy.
            6.⁠ ⁠Dodaj subtelne elementy wzmacniające SEO:
            - Synonimy branżowe
            - Naturalne long-tail frazy
            - Frazy lokalne jeśli podane
            7.⁠ ⁠Wypisz gotowy do publikacji tekst w języku polskim, bez nagłówków, bez wstawiania „firma X”, użyj neutralnego tonu.

            Dane wejściowe:

            Opis źródłowy: {original_text[:1500]}
            Nazwa: {company_name}
            Miasto / Lokalizacja (opcjonalnie): {city}

            Wynik: [AI ma wygenerować gotowy opis od 700 do 1200 znaków, unikalny, SEO-friendly, gotowy do publikacji na stronie katalogowej]"""

    try:
        init_openai()
        response = client.chat.completions.create(
            model="gpt-4.1-nano",  # Lub "gpt-4o-mini" jako fallback
            messages=[
                {"role": "system", "content": "Jesteś copywriterem SEO. Pisz unikalne, wartościowe opisy firm po polsku. Unikaj powtórzeń z oryginałem."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        ai_usage_counter += 1
        result = response.choices[0].message.content.strip()
        print(f"      🤖 OpenAI OK ({ai_usage_counter}/{MAX_AI_REQUESTS}) | {len(result)} znaków")
        return result[:1200]
    except Exception as e:
        print(f"⚠️ OpenAI błąd: {e}")
        return original_text[:1000]

def enrich_company_from_profile(conn, basic_company):
    global total_companies_processed  # NOWE!
    
    # NOWE: Sprawdzenie limitu firm
    if total_companies_processed >= MAX_TOTAL_COMPANIES:
        print(f"🛑 Limit firm osiągnięty ({MAX_TOTAL_COMPANIES:,})!")
        basic_company["_STOP_SCRAPER"] = True
        return basic_company
    
    # 1. SPRAWDZENIE CZY FIRMA JUŻ ISTNIEJE W BAZIE (po slugu)
    potential_slug = slugify(basic_company["name"])
    if company_exists(conn, potential_slug):
        print(f"      ⏭️  Pomijam (już istnieje): {basic_company['name'][:30]}")
        return None

    total_companies_processed += 1  # NOWE! Liczymy każdą przetworzoną firmę
    print(f"      📊 Firm: {total_companies_processed:,}/{MAX_TOTAL_COMPANIES:,}")

    url = basic_company.get("url")
    if not url: return basic_company
    if not url.startswith("http"): url = BASE_URL + "/" + url.lstrip("/")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception: return basic_company
    
    js_data = extract_company_variable(resp.text)
    if not js_data: 
        return basic_company
    
    nip = js_data.get("nip")
    if nip: 
        cur = conn.cursor()
        cur.execute('SELECT 1 FROM "Company" WHERE nip = %s', (str(nip),))
        if cur.fetchone():
            print(f"      ⏭️  Pomijam (NIP istnieje): {nip}")
            cur.close()
            return None
        cur.close()
        basic_company["nip"] = str(nip)
    
    parts = []
    for field in ["announcementBrief", "products", "summary"]:
        field_data = js_data.get(field)
        if field_data:
            text = clean_html_text(field_data)
            if text and len(text) > 10: parts.append(text)
    raw_desc = "\n\n".join(parts)
    basic_company["raw_desc"] = raw_desc if raw_desc else None

    if USE_AI_REWRITE and raw_desc and len(raw_desc) > 50:
        if ai_usage_counter < MAX_AI_REQUESTS:
            print(f"      🤖 OpenAI... ({ai_usage_counter + 1}/{MAX_AI_REQUESTS})")
            ai_desc = rewrite_description_with_ai(raw_desc[:1500], basic_company["name"], basic_company.get("city", "Polska"))
            
            if ai_desc is None:
                print("      🛑 Limit AI osiągnięty!")
                basic_company["_STOP_SCRAPER"] = True
                return basic_company
            
            basic_company["desc"] = ai_desc
            time.sleep(1)  # Krótszy sleep dla OpenAI (szybsze)
        else:
            print("      🛑 Limit AI wyczerpany!")
            basic_company["_STOP_SCRAPER"] = True
            return basic_company
    else:
        basic_company["desc"] = None
    
    contact = js_data.get("contact") or {}
    basic_company["email"] = contact.get("email")
    basic_company["website"] = contact.get("www")
    phone = contact.get("phone")
    basic_company["phone"] = phone.get("formatted") or phone.get("number") if isinstance(phone, dict) else phone
    
    loc = js_data.get("location") or {}
    city_data = loc.get("city")
    basic_company["city"] = city_data.get("name") if isinstance(city_data, dict) else city_data
    street = loc.get("street")
    if isinstance(street, dict):
        street_name = street.get("normalizedName") or street.get("name")
        street_num = street.get("number")
        basic_company["address"] = f"{street_name} {street_num}" if street_name and street_num else street_name
    basic_company["zip"] = loc.get("zip")
    coords = loc.get("coordinates")
    if isinstance(coords, dict):
        basic_company["lat"], basic_company["lng"] = coords.get("lat"), coords.get("lon")
        
    return basic_company

def get_unique_slug(conn, base_name, tenant_id):
    base_slug = slugify(base_name)
    slug = base_slug
    counter = 1
    
    cur = conn.cursor()
    while True:
        cur.execute('SELECT id FROM "Company" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
        if not cur.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    cur.close()
    return slug

def save_to_db(conn, companies):
    cur = conn.cursor()
    inserted = 0
    updated = 0
    
    for c in companies:
        if not c.get("name"): continue
        
        tenant_id, subdomain = get_tenant_id_by_category(conn, c.get("category_name", "Inne"))
        cat_id = get_or_create_category(conn, tenant_id, c.get("category_name", "Inne"))
        
        existing_id = None
        
        if c.get("nip"):
            cur.execute('SELECT id FROM "Company" WHERE nip = %s', (c["nip"],))
            row = cur.fetchone()
            if row: existing_id = row[0]
            
        raw_desc_safe = c.get("raw_desc") or ""
        desc = c.get("desc") or raw_desc_safe[:1000]

        if existing_id:
            cur.execute("""
                UPDATE "Company" SET 
                    description=COALESCE(description, %s),
                    phone=COALESCE(phone, %s), 
                    email=COALESCE(email, %s),
                    website=COALESCE(website, %s), 
                    address=COALESCE(address, %s),
                    city=COALESCE(city, %s), 
                    zip=COALESCE(zip, %s),
                    lat=COALESCE(lat, %s), 
                    lng=COALESCE(lng, %s),
                    "updatedAt" = NOW()
                WHERE id = %s
            """, (desc, c.get("phone"), c.get("email"), c.get("website"),
                  c.get("address"), c.get("city"), c.get("zip"), 
                  c.get("lat"), c.get("lng"), existing_id))
            updated += 1
        else:
            unique_slug = get_unique_slug(conn, c["name"], tenant_id)
            cur.execute("""
                INSERT INTO "Company" 
                (id, "tenantId", name, slug, address, city, zip, phone, email, website, 
                 description, "categoryId", plan, "isVerified", nip, lat, lng, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), tenant_id, c["name"], unique_slug, 
                  c.get("address"), c.get("city"), c.get("zip"), c.get("phone"), 
                  c.get("email"), c.get("website"), desc, cat_id, 
                  c.get("nip"), c.get("lat"), c.get("lng")))
            inserted += 1
            print(f"   ✅ INSERT [{subdomain}]: {c['name'][:30]} (slug: {unique_slug})")

    conn.commit()
    cur.close()
    print(f"   💾 BAZA: +{inserted} nowych, {updated} zaktualizowanych")

if __name__ == "__main__":
    if not OPENAI_API_KEY and USE_AI_REWRITE:
        print("⚠️ Brak OPENAI_API_KEY w .env - AI wyłączone")
        USE_AI_REWRITE = False
    
    conn = connect_db()
    total_firms = 0
    categories = scrape_all_categories()
    stop_signal = False

    print(f"📊 Do przeszukania: {len(categories)} kategorii | Limit firm: {MAX_TOTAL_COMPANIES:,}")

    for i, cat in enumerate(categories, 1):
        if stop_signal: break
        print(f"\n🚀 [{i}/{len(categories)}] {cat['name']}")
        companies = scrape_category_listing(cat['url'], pages=MAX_PAGES_PER_CATEGORY)
        
        enriched = []
        for j, company in enumerate(companies, 1):
            # Sprawdzenie wszystkich limitów PRZED przetwarzaniem
            if total_companies_processed >= MAX_TOTAL_COMPANIES:
                print(f"\n🛑 GLOBALNY LIMIT FIRM OSIĄGNIĘTY ({MAX_TOTAL_COMPANIES:,})!")
                stop_signal = True
                break
            
            if ai_usage_counter >= MAX_AI_REQUESTS:
                print("\n🛑 LIMIT AI OSIĄGNIĘTY (Global). STOP.")
                stop_signal = True
                break
            
            print(f"   [{j}/{len(companies)}] {company['name'][:50]}...")
            company["category_name"] = cat["name"]
            
            processed = enrich_company_from_profile(conn, company)
            
            if processed is None: continue 

            if processed.get("_STOP_SCRAPER"):
                print("\n🛑 STOP SIGNAL odebrany!")
                stop_signal = True
                break
                
            enriched.append(processed)
        
        if enriched: save_to_db(conn, enriched)
        total_firms += len(enriched)
        if stop_signal: break
        time.sleep(3)
    
    conn.close()
    print(f"\n🎉 KONIEC! Zapisano {total_firms} firm. AI: {ai_usage_counter}/{MAX_AI_REQUESTS} | Przetworzono: {total_companies_processed:,}/{MAX_TOTAL_COMPANIES:,}")
