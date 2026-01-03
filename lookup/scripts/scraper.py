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

warnings.simplefilter(action='ignore', category=FutureWarning)
load_dotenv()

# KONFIGURACJA
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()
SCRAPE_ALL_CATEGORIES = os.getenv("SCRAPE_ALL_CATEGORIES", "false").upper() == "TRUE"
USE_AI_REWRITE = SCRAPER_MODE == "MAIN" and bool(OPENAI_API_KEY)

MAX_TOTAL_COMPANIES = int(os.getenv("MAX_TOTAL_COMPANIES", "10000"))
AI_PAUSE_HOURS = int(os.getenv("AI_PAUSE_HOURS", "12"))  # NOWE! Pauza po limicie AI

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "5"))
MAX_CATEGORIES = int(os.getenv("MAX_CATEGORIES", "10"))
MAX_AI_REQUESTS = int(os.getenv("MAX_AI_REQUESTS", "5000"))

# Liczniki
ai_usage_counter = 0
total_companies_processed = 0
ai_paused = False

client = None

print(f"🟢 Tryb: {SCRAPER_MODE} | AI: {'✓' if USE_AI_REWRITE else '✗'} | Pauza po AI: {AI_PAUSE_HOURS}h")
print(f"📉 Limity: Firm {MAX_TOTAL_COMPANIES:,} | AI {MAX_AI_REQUESTS}")

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
        print("❌ .env: brak DB creds")
        exit(1)
    try:
        return psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASS)
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

def company_needs_ai_update(conn, slug, tenant_id):
    cur = conn.cursor()
    cur.execute(
        'SELECT description FROM "Company" WHERE slug = %s AND "tenantId" = %s',
        (slug, tenant_id)
    )
    row = cur.fetchone()
    cur.close()

    if not row:
        return True

    desc = row[0] or ""
    return len(desc) < 300

def company_exists_by_nip(conn, nip):
    if not nip:
        return False
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM "Company" WHERE nip = %s', (str(nip),))
    exists = cur.fetchone() is not None
    cur.close()
    return exists


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
    popular = [
        # "https://panoramafirm.pl/serwis_agd", "https://panoramafirm.pl/biura_rachunkowe", 
        # "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie", "https://panoramafirm.pl/salony_i_gabinety_kosmetyczne",
        # "https://panoramafirm.pl/warsztaty_samochodowe", "https://panoramafirm.pl/mechanicy",
        # "https://panoramafirm.pl/hydraulicy", "https://panoramafirm.pl/elektrycy", "https://panoramafirm.pl/adwokaci"
        "https://panoramafirm.pl/agencje_artystyczne", "https://panoramafirm.pl/agencje_modelek",
        "https://panoramafirm.pl/architekci", "https://panoramafirm.pl/biura_projektowe",
        "https://panoramafirm.pl/biura_tlumaczen", "https://panoramafirm.pl/drukarnie","https://panoramafirm.pl/automaty_do_gier","https://panoramafirm.pl/artyku%C5%82y_zoologiczne"
    ]
    for url in popular:
        categories.append({"name": os.path.basename(url.rstrip("/")).replace("_", " ").title(), "url": url})
    
    if SCRAPE_ALL_CATEGORIES:
        print("🔍 Pobieram dodatkowe kategorie...")
        try:
            resp = requests.get("https://panoramafirm.pl/biuro", headers=HEADERS, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.select("a.dropdown-item[href*='/branze.html']"):
                href = link.get("href", "")
                title = link.get_text(strip=True)
                if href and title:
                    categories.append({"name": title, "url": f"{BASE_URL}{href.replace('/branze.html', '')}"})
        except Exception as e:
            print(f"⚠️ Błąd kategorii: {e}")

    seen = set()
    unique = [cat for cat in categories if cat['url'] not in seen and not seen.add(cat['url'])]
    return unique[:MAX_CATEGORIES]

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
    
    return list({r['url']: r for r in results}.values())

def rewrite_description_with_ai(original_text, company_name, city):
    global ai_usage_counter, ai_paused

    if ai_paused:
        print("🛑 AI PAUSED – pomijam wszystkie firmy")
        return None

    if ai_usage_counter >= MAX_AI_REQUESTS:
        print(f"🛑 Limit AI ({MAX_AI_REQUESTS}) – wstrzymuję AI")
        ai_paused = True
        return None

    prompt = f"""
    Napisz unikalny, profesjonalny opis firmy do katalogu lokalnych usług.

    WYMAGANIA:
    - Język: polski
    - Długość: 700–1200 znaków
    - Styl: naturalny, ekspercki, bez marketingowego bełkotu
    - Zero list punktowanych
    - Zero emoji
    - Zero nagłówków
    - Zero zdań typu „zapraszamy do kontaktu” na końcu

    SEO:
    - Użyj naturalnie nazwy firmy: {company_name}
    - Użyj miasta i okolic: {city}
    - Stosuj synonimy i odmiany (bez sztucznego powtarzania fraz)
    - Tekst ma brzmieć jak napisany przez człowieka, nie AI

    STRUKTURA TEKSTU:
    1. Pierwsze 2 zdania: kim jest firma + lokalizacja
    2. Kolejny akapit: zakres usług (konkretne czynności)
    3. Kolejny akapit: dla kogo są usługi i jakie problemy rozwiązują
    4. Kolejny akapit: doświadczenie, podejście, jakość
    5. Ostatni akapit: lokalny charakter działalności

    MATERIAŁ ŹRÓDŁOWY (do przetworzenia, nie kopiuj):
    {original_text[:1200]}

    Wygeneruj wyłącznie gotowy opis.
    """

    try:
        init_openai()
        response = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": "Jesteś doświadczonym copywriterem SEO. Pisz po polsku."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.7
        )
        ai_usage_counter += 1
        text = response.choices[0].message.content.strip()
        print(f"🤖 AI OK ({ai_usage_counter}/{MAX_AI_REQUESTS}) | {len(text)} znaków")
        return text
    except Exception as e:
        print(f"⚠️ OpenAI error: {e}")
        return None


def enrich_company_from_profile(conn, basic_company):
    global total_companies_processed

    if total_companies_processed >= MAX_TOTAL_COMPANIES:
        return None

    total_companies_processed += 1
    print(f"📊 Firmy: {total_companies_processed}/{MAX_TOTAL_COMPANIES}")

    url = basic_company.get("url")
    if not url:
        return None
    if not url.startswith("http"):
        url = BASE_URL + "/" + url.lstrip("/")

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception:
        return None

    js_data = extract_company_variable(resp.text)
    if not js_data:
        return None

    # 🔑 NIP CHECK (JEDYNE ŹRÓDŁO PRAWDY)
    nip = js_data.get("nip")
    if nip:
        if company_exists_by_nip(conn, nip):
            print("⏭️ Pomijam (NIP istnieje)")
            return None
        basic_company["nip"] = str(nip)

    # RAW DESC – ŁAGODNY PRÓG
    parts = []
    for field in ["announcementBrief", "products", "summary"]:
        text = clean_html_text(js_data.get(field))
        if text and len(text) > 10:
            parts.append(text)

    raw_desc = "\n\n".join(parts)
    if len(raw_desc) < 20:
        print("⏭️ Za krótki opis źródłowy:", len(raw_desc))
        return None

    # 🤖 AI – ZAWSZE DLA NOWYCH
    if USE_AI_REWRITE:
        ai_desc = rewrite_description_with_ai(
            raw_desc,
            basic_company["name"],
            basic_company.get("city", "Polska")
        )

        if not ai_desc:
            print("⚠️ AI fail – pomijam firmę")
            return None

        basic_company["desc"] = ai_desc
        print("🤖 AI USED ✔", basic_company["name"][:40])
        time.sleep(1)
    else:
        basic_company["desc"] = raw_desc[:1000]

    basic_company["raw_desc"] = raw_desc

    # KONTAKT
    contact = js_data.get("contact") or {}
    basic_company["email"] = contact.get("email")
    basic_company["website"] = contact.get("www")

    phone = contact.get("phone")
    if isinstance(phone, dict):
        basic_company["phone"] = phone.get("formatted") or phone.get("number")
    else:
        basic_company["phone"] = phone

    loc = js_data.get("location") or {}
    city = loc.get("city")
    basic_company["city"] = city.get("name") if isinstance(city, dict) else city

    street = loc.get("street")
    if isinstance(street, dict):
        basic_company["address"] = f"{street.get('name')} {street.get('number')}"
    else:
        basic_company["address"] = street

    basic_company["zip"] = loc.get("zip")

    coords = loc.get("coordinates")
    if isinstance(coords, dict):
        basic_company["lat"] = coords.get("lat")
        basic_company["lng"] = coords.get("lon")

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
    
    for c in companies:
        if not c.get("name"):
            continue

        description = c.get("desc") or c.get("raw_desc")
        if not description or len(description) < 200:
            print(f"   ⏭️ Pomijam (brak opisu): {c['name'][:30]}")
            continue
        
        tenant_id, subdomain = get_tenant_id_by_category(
            conn, c.get("category_name", "Inne")
        )
        cat_id = get_or_create_category(
            conn, tenant_id, c.get("category_name", "Inne")
        )
        unique_slug = get_unique_slug(conn, c["name"], tenant_id)
        
        cur.execute("""
            INSERT INTO "Company" 
            (id, "tenantId", name, slug, address, city, zip, phone, email, website, 
             description, "categoryId", plan, "isVerified", nip, lat, lng, 
             "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                    'FREE', false, %s, %s, %s, NOW(), NOW())
        """, (
            str(uuid.uuid4()),
            tenant_id,
            c["name"],
            unique_slug,
            c.get("address"),
            c.get("city"),
            c.get("zip"),
            c.get("phone"),
            c.get("email"),
            c.get("website"),
            description,
            cat_id,
            c.get("nip"),
            c.get("lat"),
            c.get("lng")
        ))
        
        inserted += 1
        print(
            f"   ✅ INSERT [{subdomain}]: "
            f"{c['name'][:30]} | {len(description)} znaków"
        )
    
    conn.commit()
    cur.close()
    print(f"   💾 +{inserted} FIRM Z OPISEM")


if __name__ == "__main__":
    if not OPENAI_API_KEY:
        print("⚠️ Brak OPENAI_API_KEY - AI wyłączone")
        USE_AI_REWRITE = False
    
    conn = connect_db()
    total_firms = 0
    categories = scrape_all_categories()
    
    print(f"📊 Kategorie: {len(categories)} | Limit: {MAX_TOTAL_COMPANIES:,}")

    for i, cat in enumerate(categories, 1):
        if total_companies_processed >= MAX_TOTAL_COMPANIES: break
        print(f"\n🚀 [{i}/{len(categories)}] {cat['name']}")
        companies = scrape_category_listing(cat['url'])
        
        enriched = []
        for j, company in enumerate(companies, 1):
            if total_companies_processed >= MAX_TOTAL_COMPANIES: break
            
            print(f"   [{j}/{len(companies)}] {company['name'][:50]}...")
            company["category_name"] = cat["name"]
            
            processed = enrich_company_from_profile(conn, company)
            if processed is None: continue
                
            enriched.append(processed)
        
        if enriched: 
            save_to_db(conn, enriched)
            total_firms += len(enriched)
        
        time.sleep(2)
    
    conn.close()
    print(f"\n🎉 KONIEC! {total_firms} FIRM Z AI | AI: {ai_usage_counter}/{MAX_AI_REQUESTS}")
