import requests
from bs4 import BeautifulSoup
import psycopg2
import time
import random
import json
import uuid
import re
import os
from dotenv import load_dotenv
import google.generativeai as genai

# 1. Ładujemy zmienne z pliku .env
load_dotenv()

# 2. Pobieramy klucz ze zmiennych środowiskowych
GOOGLE_API_KEY = os.getenv("GOOGLE_AI_KEY")

USE_AI_REWRITE = True
model = None 

# Sprawdzamy, czy klucz został załadowany
if not GOOGLE_API_KEY:
    print("⚠️ BRAK KLUCZA GOOGLE_AI_KEY w pliku .env! AI zostanie wyłączone.")
    USE_AI_REWRITE = False

if USE_AI_REWRITE:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # Lista modeli priorytetowych (od najnowszego/najszybszego)
        preferred_models = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
            'gemini-pro'
        ]
        
        # Pobieramy listę modeli dostępnych dla Twojego klucza
        available_models = []
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name.replace('models/', ''))
        except Exception as e:
            print(f"⚠️ Błąd połączenia z API Google (list_models): {e}")
            available_models = []
        
        # Wybieramy najlepszy dostępny
        selected_model_name = next((m for m in preferred_models if m in available_models), None)
        
        # Fallback
        if not selected_model_name and available_models:
            selected_model_name = available_models[0]
        
        # Fallback ostateczny (jeśli list_models zawiedzie, spróbuj 'gemini-pro' na ślepo)
        if not selected_model_name:
            selected_model_name = 'gemini-pro'

        if selected_model_name:
            print(f"✅ AI Aktywne: Używam modelu {selected_model_name}")
            model = genai.GenerativeModel(selected_model_name)
        else:
            print("⚠️ Nie udało się skonfigurować modelu. AI wyłączone.")
            USE_AI_REWRITE = False
            
    except Exception as e:
        print(f"⚠️ Błąd konfiguracji AI: {e}. AI wyłączone.")
        USE_AI_REWRITE = False

# ===== KONFIGURACJA BAZY =====
# Też pobieramy z env, jeśli tam są, lub fallback do hardcoded (dla wstecznej kompatybilności)
# DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
# DB_PORT = os.getenv("DB_PORT", "5433")
# DB_NAME = os.getenv("DB_NAME", "wenet")
# DB_USER = os.getenv("DB_USER", "postgres")
# DB_PASS = os.getenv("DB_PASS", "wenet123")

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

# ===== POZOSTAŁA KONFIGURACJA =====
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
}
BASE_URL = "https://panoramafirm.pl"

TENANT_MAP = {
    "mechanicy": ["mechanik", "auto", "samochod", "pojazd", "wulkanizacja", "opony", "lakierni", "blachar", "warsztat"],
    "ksiegowi": ["księg", "rachunk", "biuro rachunkowe", "podatk", "audyt", "finans"],
    "budowlanka": ["budow", "remont", "wykończ", "hydraul", "elektryk", "dach", "okna", "drzwi"],
    "lekarze": ["lekarz", "medycz", "przychodnia", "stomatolog", "dentysta", "rehabilit", "ginekolog"],
    "fryzjerzy": ["fryzjer", "kosmety", "salon urody", "spa", "wizaż"],
    "prawnicy": ["adwokat", "prawn", "notariusz", "radca", "kancelaria"],
    "transport": ["transport", "przewóz", "spedycja", "logistyk", "kurier", "przeprowadzki"],
    "serwis_agd": ["agd", "pralka", "lodowka", "zmywarka", "naprawa", "serwis"]
}
DEFAULT_TENANT_SUBDOMAIN = "katalog"

def connect_db():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def slugify(text):
    if not text: return ""
    text = text.lower()
    replacements = {'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'}
    for k, v in replacements.items(): text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')

def get_tenant_id_by_category(conn, category_name):
    cat_lower = category_name.lower()
    target_subdomain = DEFAULT_TENANT_SUBDOMAIN
    for subdomain, keywords in TENANT_MAP.items():
        if any(k in cat_lower for k in keywords):
            target_subdomain = subdomain
            break
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Tenant" WHERE subdomain = %s', (target_subdomain,))
    row = cur.fetchone()
    if row: tenant_id = row[0]
    else:
        tenant_id = str(uuid.uuid4())
        name = "Katalog Firm" if target_subdomain == "katalog" else f"Katalog {target_subdomain.capitalize()}"
        cur.execute('INSERT INTO "Tenant" (id, name, subdomain, "createdAt") VALUES (%s, %s, %s, NOW())', (tenant_id, name, target_subdomain))
        conn.commit()
    cur.close()
    return tenant_id, target_subdomain

def get_or_create_category(conn, tenant_id, name):
    slug = slugify(name)
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Category" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
    row = cur.fetchone()
    if row: cat_id = row[0]
    else:
        cat_id = str(uuid.uuid4())
        cur.execute('INSERT INTO "Category" (id, name, slug, "tenantId") VALUES (%s, %s, %s, %s)', (cat_id, name, slug, tenant_id))
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
                    json_str = html_content[json_start:i+1]
                    try: return json.loads(json_str)
                    except: return None
        if char == '\\' and not escape: escape = True
        else: escape = False
    return None

def clean_html_text(html_text):
    if not html_text: return None
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(separator="\n").strip()

def scrape_category_listing(listing_url, pages=1):
    results = []
    category_name = listing_url.strip("/").split("/")[-1].replace("_", " ").title()
    session = requests.Session()
    session.headers.update(HEADERS)
    for page in range(1, pages + 1):
        url = f"{listing_url}/firmy,{page}.html" if page > 1 else listing_url
        print(f"🔍 Listing: {url}")
        try:
            resp = session.get(url)
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, "html.parser")
            company_links = soup.select("h2 a.company-name") or soup.select("a.company-name")
            for link in company_links:
                href = link.get('href')
                name = link.get_text(strip=True)
                if href:
                    results.append({"name": name, "url": href, "category_name": category_name})
        except: pass
        time.sleep(1)
    unique_results = []
    seen_urls = set()
    for r in results:
        if r['url'] not in seen_urls:
            unique_results.append(r)
            seen_urls.add(r['url'])
    return unique_results

# ===== FUNKCJA AI DO PRZEPISYWANIA =====
def rewrite_description_with_ai(original_text, company_name, city):
    """Wysyła opis do Gemini i zwraca wersję unikalną pod SEO"""
    if not USE_AI_REWRITE or not model or not original_text or len(original_text) < 50:
        return original_text

    prompt = f"""
                Twoim zadaniem jest przerobić poniższy opis firmy tak, aby:

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

                Opis źródłowy:
                {original_text}


                Nazwa firmy:
                {company_name}

                Miasto / Lokalizacja (opcjonalnie):
                {city}

                ---

                Wynik:
                [AI ma wygenerować gotowy opis od 700 do 1200 znaków, unikalny, SEO-friendly, gotowy do publikacji na stronie katalogowej]

    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"      ⚠️ Błąd AI: {e}")
        return original_text 

# ===== WZBOGACANIE =====
def enrich_company_from_profile(basic_company):
    url = basic_company.get("url")
    if not url: return basic_company
    if not url.startswith("http"): url = BASE_URL + "/" + url.lstrip("/")
    if "/firmy," in url or url.endswith("/szukaj"): return basic_company

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if "firmy," in resp.url: return basic_company
        resp.raise_for_status()
    except: return basic_company

    js_data = extract_company_variable(resp.text)
    
    if js_data:
        if js_data.get("nip"): basic_company["nip"] = str(js_data["nip"])

        parts = []
        if js_data.get("announcementBrief"): parts.append(clean_html_text(js_data["announcementBrief"]))
        if js_data.get("products"): parts.append(clean_html_text(js_data["products"]))
        if not parts and js_data.get("summary"): parts.append(clean_html_text(js_data["summary"]))

        raw_desc = "\n\n".join(parts)
        
        # AI REWRITE
        if raw_desc:
            print(f"      🤖 Generuję opis AI ({len(raw_desc)} znaków)...")
            time.sleep(4)  # Rate limiting
            basic_company["desc"] = rewrite_description_with_ai(
                raw_desc, 
                basic_company['name'], 
                basic_company.get('city', 'Polska')
            )
        else:
            basic_company["desc"] = ""

        contact = js_data.get("contact", {})
        if contact.get("email"): basic_company["email"] = contact["email"]
        if contact.get("www"): basic_company["website"] = contact["www"]
        if contact.get("phone") and isinstance(contact["phone"], dict): 
            basic_company["phone"] = contact["phone"].get("formatted") or contact["phone"].get("number")
            
        loc = js_data.get("location", {})
        if loc.get("city") and isinstance(loc["city"], dict): basic_company["city"] = loc["city"].get("name")
        elif loc.get("city"): basic_company["city"] = str(loc.get("city"))

        street_part = ""
        if loc.get("street") and isinstance(loc["street"], dict):
             street_name = loc["street"].get("normalizedName") or loc["street"].get("name")
             street_num = loc["street"].get("number")
             if street_name: street_part = f"{street_name} {street_num}" if street_num else street_name
        if street_part: basic_company["address"] = street_part
        if loc.get("zip"): basic_company["zip"] = loc["zip"]
        if loc.get("coordinates"):
            basic_company["lat"] = loc["coordinates"].get("lat")
            basic_company["lng"] = loc["coordinates"].get("lon")
    else:
        # Fallback NIP
        if not basic_company.get("nip"):
            text = BeautifulSoup(resp.text, "html.parser").get_text()
            nip_match = re.search(r'\b(\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2})\b|\b(\d{10})\b', text)
            if nip_match: basic_company["nip"] = nip_match.group(0).replace("-", "").replace(" ", "")

    return basic_company

def save_to_db(conn, companies):
    cur = conn.cursor()
    inserted = 0
    updated = 0
    
    for c in companies:
        if not c.get("name"): continue
        
        tenant_id, sub = get_tenant_id_by_category(conn, c.get("category_name", "Inne"))
        slug = slugify(c["name"])[:50]
        
        existing_id = None
        if c.get("nip"):
            cur.execute('SELECT id FROM "Company" WHERE nip=%s', (c["nip"],))
            row = cur.fetchone()
            if row: existing_id = row[0]
        if not existing_id:
            cur.execute('SELECT id FROM "Company" WHERE "tenantId"=%s AND slug=%s', (tenant_id, slug))
            row = cur.fetchone()
            if row: existing_id = row[0]

        cat_id = get_or_create_category(conn, tenant_id, c.get("category_name", "Inne"))
        desc_val = c.get("desc")
        
        if existing_id:
            try:
                cur.execute("""
                    UPDATE "Company"
                    SET nip = COALESCE(nip, %s), description = COALESCE(description, %s),
                        phone = COALESCE(phone, %s), email = COALESCE(email, %s),
                        website = COALESCE(website, %s), address = COALESCE(address, %s),
                        city = COALESCE(city, %s), zip = COALESCE(zip, %s),
                        lat = COALESCE(lat, %s), lng = COALESCE(lng, %s)
                    WHERE id = %s
                """, (c.get("nip"), desc_val, c.get("phone"), c.get("email"), c.get("website"), c.get("address"), c.get("city"), c.get("zip"), c.get("lat"), c.get("lng"), existing_id))
                updated += 1
            except: conn.rollback()
        else:
            try:
                cur.execute("""
                    INSERT INTO "Company" (id, "tenantId", name, slug, address, city, zip, phone, email, website, description, "categoryId", plan, "isVerified", nip, lat, lng)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false, %s, %s, %s)
                """, (str(uuid.uuid4()), tenant_id, c["name"], slug, c.get("address"), c.get("city"), c.get("zip"), c.get("phone"), c.get("email"), c.get("website"), desc_val, cat_id, c.get("nip"), c.get("lat"), c.get("lng")))
                inserted += 1
                print(f"   ✅ [->{sub}] Dodano: {c['name']}")
            except: conn.rollback()
    conn.commit()
    cur.close()
    print(f"💾 Wynik: {inserted} nowych, {updated} zaktualizowanych.")

if __name__ == "__main__":
    conn = connect_db()
    urls = [
        "https://panoramafirm.pl/serwis_agd",
        # "https://panoramafirm.pl/salony_i_gabinety_kosmetyczne",
        # "https://panoramafirm.pl/biura_rachunkowe",
        # "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie",
        # "https://panoramafirm.pl/serwis_komputer%C3%B3w",
        # "https://panoramafirm.pl/sieci_komputerowe_i_integracja_system%C3%B3w",
        # "https://panoramafirm.pl/sprzeda%C5%BC_komputer%C3%B3w",
        # "https://panoramafirm.pl/oprogramowanie_komputerowe"
    ]
    for u in urls:
        print(f"\n🚀 Start kategoria: {u}")
        basic_list = scrape_category_listing(u, pages=1) 
        enriched_list = []
        for i, item in enumerate(basic_list, 1):
            print(f"[{i}/{len(basic_list)}] Pobieram: {item['name']}")
            enriched_list.append(enrich_company_from_profile(item))
        save_to_db(conn, enriched_list)
    conn.close()
