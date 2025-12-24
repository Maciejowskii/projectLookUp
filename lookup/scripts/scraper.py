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

# 1. Ładujemy zmienne z pliku .env
load_dotenv()

# 2. Konfiguracja
GOOGLE_API_KEY = os.getenv("GOOGLE_AI_KEY")
SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()  # MAIN | RAW
SCRAPE_ALL_CATEGORIES = os.getenv("SCRAPE_ALL_CATEGORIES", "false").upper() == "TRUE"
USE_AI_REWRITE = SCRAPER_MODE == "MAIN"

# Konfiguracja bazy
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

# Limity
MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "5"))
MAX_CATEGORIES = int(os.getenv("MAX_CATEGORIES", "10"))

model = None

print(f"🟢 Tryb: {SCRAPER_MODE} | Kategorie: {'AUTO' if SCRAPE_ALL_CATEGORIES else 'RĘCZNE'} | AI: {'✓' if USE_AI_REWRITE else '✗'}")

# Konfiguracja AI (lazy loading)
def init_ai():
    global model, USE_AI_REWRITE
    if not USE_AI_REWRITE: return False
    try:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        print("✅ AI: gemini-2.5-flash ✓")
        return True
    except:
        print("⚠️ AI niedostępne")
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
    """Bezpieczne połączenie z bazą"""
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
    for k, v in replacements.items(): text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')[:50]

def get_tenant_id_by_category(conn, category_name):
    """Pobiera/ tworzy Tenant dla kategorii"""
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
    """Pobiera/ tworzy Category"""
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
    """Wyciąga var company = {...} z JS"""
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
        if char == '"' and not escape: 
            in_string = not in_string
        if not in_string:
            if char == '{': bracket_count += 1
            elif char == '}':
                bracket_count -= 1
                if bracket_count == 0:
                    json_str = html_content[json_start:i+1]
                    try:
                        return json.loads(json_str)
                    except:
                        return None
        if char == '\\' and not escape: 
            escape = True
        else: 
            escape = False
    return None

def clean_html_text(html_text):
    if not html_text: return ""
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(separator="\n").strip()

def scrape_all_categories():
    """Scrapuje 50+ PODKATEGORII z liter A-Z (prawidłowo!)"""
    print("🔍 Pobieram 50+ podkategorii z liter A-Z...")
    
    try:
        resp = requests.get("https://panoramafirm.pl/biuro", headers=HEADERS, timeout=15)  # Strona z literami
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        categories = []
        
        # 1. DROPDOWN - główne grupy (Biuro, Budownictwo, etc.)
        dropdown_links = soup.select("a.dropdown-item[href*='/branze.html']")
        for link in dropdown_links:
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if href and title:
                clean_url = href.replace("/branze.html", "")
                categories.append({
                    "name": title,
                    "url": f"{BASE_URL}{clean_url}"
                })
        
        # 2. LITERY A-Z - PODKATEGORIE (główne złoto!)
        letter_links = soup.select("a[href^='/'][href$='/']")  # /kategoria/
        for link in letter_links:
            href = link.get("href", "").rstrip("/")
            title = link.get_text(strip=True)
            
            # Podkategorie biurowe + inne popularne
            if (href and len(href) > 3 and title and 
                any(kw in href for kw in [
                    'serwis_', 'meble_', 'ksero', 'pieczątki', 'artykuły_', 
                    'drukarki', 'komputer', 'oprogramowanie', 'papier', 'kserokopiarki'
                ])):
                
                categories.append({
                    "name": title.replace("_", " ").title(),
                    "url": f"{BASE_URL}{href}"
                })
        
        # 3. POPULARNE KATEGORIE (pewniak)
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
            categories.append({
                "name": os.path.basename(url.rstrip("/")).replace("_", " ").title(),
                "url": url
            })
        
        # 4. Usuń duplikaty
        seen = set()
        unique = []
        for cat in categories:
            if cat['url'] not in seen:
                seen.add(cat['url'])
                unique.append(cat)
        
        result = unique[:MAX_CATEGORIES]
        
        print(f"✅ {len(result)} unikalnych kategorii:")
        for i, cat in enumerate(result[:15], 1):
            print(f"   {i:2d}. {cat['name']:<25} → {os.path.basename(cat['url'])}")
        
        return result
        
    except Exception as e:
        print(f"⚠️ Fallback: {e}")
        return [
            {"name": "Serwis AGD", "url": "https://panoramafirm.pl/serwis_agd"},
            {"name": "Biura rachunkowe", "url": "https://panoramafirm.pl/biura_rachunkowe"},
            {"name": "Fryzjerzy", "url": "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie"},
        ]

def scrape_category_listing(listing_url, pages=1):
    """Scrapuje firmy z kategorii"""
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
            links = soup.select("h2 a.company-name, a.company-name, .company-title a")
            
            for link in links:
                href = link.get('href')
                name = link.get_text(strip=True)
                if href and name:
                    results.append({
                        "name": name, 
                        "url": href, 
                        "category_name": category_name
                    })
                    
        except Exception as e:
            print(f"   ⚠️ {e}")
        
        time.sleep(random.uniform(1, 2))
    
    # Usuń duplikaty
    seen = set()
    unique = [r for r in results if r['url'] not in seen and not seen.add(r['url'])]
    print(f"   ✅ {len(unique)} firm")
    return unique

def rewrite_description_with_ai(original_text, company_name, city):
    """AI przepisuje opis (tylko MAIN)"""
    if not USE_AI_REWRITE or not model or len(original_text) < 50:
        return original_text[:1000]
    
    prompt = f"""Przerób opis firmy (700-1200 znaków, unikalny, SEO, polski, profesjonalny):
    
Źródło: {original_text[:2000]}
Nazwa: {company_name}
Miasto: {city}

[Wynik: gotowy opis do publikacji]"""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()[:1200]
    except:
        return original_text[:1000]

def enrich_company_from_profile(basic_company):
    """Wzbogaca dane firmy - 100% BEZPIECZNIE"""
    url = basic_company.get("url")
    if not url: return basic_company
    
    if not url.startswith("http"):
        url = BASE_URL + "/" + url.lstrip("/")
    if "/firmy," in url: 
        return basic_company
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception:
        return basic_company
    
    # BEZPIECZNE parsowanie JS
    js_data = extract_company_variable(resp.text)
    if not js_data:
        return basic_company
    
    # NIP - BEZPIECZNIE
    nip = js_data.get("nip")
    if nip:
        basic_company["nip"] = str(nip)
    
    # Opis - BEZPIECZNIE
    parts = []
    for field in ["announcementBrief", "products", "summary"]:
        field_data = js_data.get(field)
        if field_data:
            text = clean_html_text(field_data)
            if text and len(text) > 10:
                parts.append(text)
    
    raw_desc = "\n\n".join(parts)
    basic_company["raw_desc"] = raw_desc if raw_desc else None

    # AI tylko MAIN i tylko jeśli jest opis
    if USE_AI_REWRITE and raw_desc and len(raw_desc) > 50:
        print("      🤖 AI...")
        init_ai()
        basic_company["desc"] = rewrite_description_with_ai(
            raw_desc[:2000], basic_company["name"], basic_company.get("city", "Polska")
        )
        time.sleep(4)
    else:
        basic_company["desc"] = raw_desc[:1000] if raw_desc else None
    
    # KONTAKT - 100% BEZPIECZNIE
    contact = js_data.get("contact")
    if isinstance(contact, dict):  # TYLO jeśli dict!
        basic_company["email"] = contact.get("email")
        basic_company["website"] = contact.get("www")
        
        phone = contact.get("phone")
        if isinstance(phone, dict):
            basic_company["phone"] = phone.get("formatted") or phone.get("number")
        else:
            basic_company["phone"] = phone
    else:
        # Brak contact - wszystkie None
        basic_company["email"] = None
        basic_company["website"] = None
        basic_company["phone"] = None
    
    # ADRES - 100% BEZPIECZNIE
    loc = js_data.get("location")
    if isinstance(loc, dict):
        # Miasto
        city_data = loc.get("city")
        if isinstance(city_data, dict):
            basic_company["city"] = city_data.get("name")
        else:
            basic_company["city"] = city_data
        
        # Ulica
        street = loc.get("street")
        if isinstance(street, dict):
            street_name = street.get("normalizedName") or street.get("name")
            street_num = street.get("number")
            if street_name:
                addr = street_name
                if street_num:
                    addr += f" {street_num}"
                basic_company["address"] = addr
        
        basic_company["zip"] = loc.get("zip")
        
        # Współrzędne
        coords = loc.get("coordinates")
        if isinstance(coords, dict):
            basic_company["lat"] = coords.get("lat")
            basic_company["lng"] = coords.get("lon")
    
    # Fallback NIP regex (bezpieczny)
    if not basic_company.get("nip"):
        try:
            text = BeautifulSoup(resp.text, "html.parser").get_text()
            nip_match = re.search(r'\b(\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2})\b|\b(\d{10})\b', text)
            if nip_match:
                basic_company["nip"] = nip_match.group(0).replace("-", "").replace(" ", "")
        except:
            pass
    
    return basic_company

def save_raw_to_db(conn, companies):
    """Zapis do RawCompany - BEZPIECZNIE"""
    cur = conn.cursor()
    inserted = 0
    
    for c in companies:
        if not c.get("name"): 
            continue
        
        try:
            cur.execute("""
                INSERT INTO "RawCompany" 
                (id, "sourceUrl", name, "categoryName", nip, email, phone, website, 
                 address, city, zip, lat, lng, "rawDesc")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                str(uuid.uuid4()), 
                c.get("url"), 
                c["name"], 
                c.get("category_name"), 
                c.get("nip"),           # Może być NULL
                c.get("email"),         # Może być NULL  
                c.get("phone"),         # Może być NULL
                c.get("website"),       # Może być NULL
                c.get("address"),       # Może być NULL
                c.get("city"),          # Może być NULL
                c.get("zip"),           # Może być NULL
                c.get("lat"),           # Może być NULL (Float)
                c.get("lng"),           # Może być NULL (Float)
                c.get("raw_desc")       # Może być NULL
            ))
            inserted += 1
            if inserted % 10 == 0:  # Commit co 10
                conn.commit()
            print(f"   💾 RAW [{inserted}]: {c['name'][:40]} ✓")
            
        except Exception as e:
            print(f"   ⚠️ RAW {c.get('name', '?')[:30]}: {e}")
            conn.rollback()
    
    conn.commit()
    cur.close()
    print(f"\n   💾 RAW: +{inserted} rekordów ✓")


def save_to_db(conn, companies):
    """Zapis do Company (z AI)"""
    cur = conn.cursor()
    inserted, updated = 0, 0
    
    for c in companies:
        if not c.get("name"): continue
        
        tenant_id, subdomain = get_tenant_id_by_category(conn, c.get("category_name", "Inne"))
        slug = slugify(c["name"])
        cat_id = get_or_create_category(conn, tenant_id, c.get("category_name", "Inne"))
        
        # Sprawdź czy istnieje
        existing_id = None
        if c.get("nip"):
            cur.execute('SELECT id FROM "Company" WHERE nip = %s', (c["nip"],))
            row = cur.fetchone()
            if row: existing_id = row[0]
        
        if not existing_id:
            cur.execute('SELECT id FROM "Company" WHERE "tenantId" = %s AND slug = %s', (tenant_id, slug))
            row = cur.fetchone()
            if row: existing_id = row[0]
        
        desc = c.get("desc") or c.get("raw_desc", "")[:1000]
        
        if existing_id:
            # UPDATE
            cur.execute("""
                UPDATE "Company" SET 
                    nip=COALESCE(nip,%s), description=COALESCE(description,%s),
                    phone=COALESCE(phone,%s), email=COALESCE(email,%s),
                    website=COALESCE(website,%s), address=COALESCE(address,%s),
                    city=COALESCE(city,%s), zip=COALESCE(zip,%s),
                    lat=COALESCE(lat,%s), lng=COALESCE(lng,%s)
                WHERE id = %s
            """, (c.get("nip"), desc, c.get("phone"), c.get("email"), c.get("website"),
                  c.get("address"), c.get("city"), c.get("zip"), c.get("lat"), c.get("lng"), existing_id))
            updated += 1
        else:
            # INSERT
            cur.execute("""
                INSERT INTO "Company" 
                (id, "tenantId", name, slug, address, city, zip, phone, email, website, 
                 description, "categoryId", plan, "isVerified", nip, lat, lng)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false, %s, %s, %s)
            """, (str(uuid.uuid4()), tenant_id, c["name"], slug, c.get("address"), c.get("city"),
                  c.get("zip"), c.get("phone"), c.get("email"), c.get("website"), desc, cat_id,
                  c.get("nip"), c.get("lat"), c.get("lng")))
            inserted += 1
            print(f"   ✅ [{subdomain}] {c['name'][:40]}")
    
    conn.commit()
    cur.close()
    print(f"   💾 MAIN: +{inserted} nowych, {updated} aktualizacji")

if __name__ == "__main__":
    conn = connect_db()
    total_firms = 0
    
    # Lista kategorii
    if SCRAPE_ALL_CATEGORIES:
        categories = scrape_all_categories()
    else:
        categories = [{"name": "Serwis AGD", "url": "https://panoramafirm.pl/serwis_agd"}]
    
    print(f"📊 Konfiguracja: {len(categories)} kategorii × {MAX_PAGES_PER_CATEGORY} stron")
    
    for i, cat in enumerate(categories, 1):
        print(f"\n🚀 [{i}/{len(categories)}] {cat['name']}")
        
        # Scrapuj WSZYSTKIE firmy z kategorii (bez limitu 20)
        companies = scrape_category_listing(cat['url'], pages=MAX_PAGES_PER_CATEGORY)
        
        if not companies:
            print("   ⚠️ Brak firm - pomijam")
            continue
        
        print(f"   📈 Znaleziono {len(companies)} firm")
        
        enriched = []
        # PRZERÓB WSZYSTKIE firmy (usuń [:20])
        for j, company in enumerate(companies, 1):
            print(f"   [{j}/{len(companies)}] {company['name'][:50]}...")
            company["category_name"] = cat["name"]
            enriched.append(enrich_company_from_profile(company))
        
        # ZAPIS WSZYSTKICH
        if SCRAPER_MODE == "RAW":
            save_raw_to_db(conn, enriched)
        else:
            save_to_db(conn, enriched)
        
        total_firms += len(enriched)
        print(f"   ✅ Kategoria: +{len(enriched)} firm (total: {total_firms})")
        
        time.sleep(3)  # Pauza między kategoriami
    
    conn.close()
    print(f"\n🎉 UKOŃCZONO! {total_firms} firm zapisanych.")

