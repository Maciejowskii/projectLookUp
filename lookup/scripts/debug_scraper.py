import requests
from bs4 import BeautifulSoup
import psycopg2
import time
import random
import json
import uuid
import re

# ===== KONFIGURACJA BAZY =====
DB_HOST = "127.0.0.1"
DB_PORT = "5433"
DB_NAME = "wenet"
DB_USER = "postgres"
DB_PASS = "wenet123"

# ===== MAPA TENANTÓW =====
TENANT_MAP = {
    "mechanicy": ["mechanik", "auto", "samochod", "pojazd", "wulkanizacja", "opony", "lakierni", "blachar", "warsztat"],
    "ksiegowi": ["księg", "rachunk", "biuro rachunkowe", "podatk", "audyt", "finans"],
    "budowlanka": ["budow", "remont", "wykończ", "hydraul", "elektryk", "dach", "okna", "drzwi"],
    "lekarze": ["lekarz", "medycz", "przychodnia", "stomatolog", "dentysta", "rehabilit", "ginekolog"],
    "fryzjerzy": ["fryzjer", "kosmety", "salon urody", "spa", "wizaż"],
    "prawnicy": ["adwokat", "prawn", "notariusz", "radca", "kancelaria"],
    "transport": ["transport", "przewóz", "spedycja", "logistyk", "kurier", "przeprowadzki"]
}

DEFAULT_TENANT_SUBDOMAIN = "katalog"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
}

BASE_URL = "https://panoramafirm.pl"

def connect_db():
    print("🔌 Łączenie z bazą PostgreSQL...")
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASS)

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

# ===== PARSER DANYCH Z JS =====
def extract_data_from_js(html_content):
    pattern = r'var company = ({.*?});'
    match = re.search(pattern, html_content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except: return None
    return None

def clean_html_text(html_text):
    if not html_text: return None
    # Zamienia <br> na nowe linie, usuwa tagi
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(separator="\n").strip()

# ===== GŁÓWNA FUNKCJA WZBOGACANIA DANYCH =====
def enrich_company_from_profile(basic_company):
    url = basic_company.get("url")
    if not url: return basic_company
    if not url.startswith("http"): url = BASE_URL + "/" + url.lstrip("/")

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        # Pomijamy strony wyszukiwania, jeśli tam nas przekierowało
        if "firmy," in resp.url or "/szukaj" in resp.url: return basic_company
        resp.raise_for_status()
    except Exception:
        return basic_company

    # 1. Próba wyciągnięcia z JS (Złoty Standard)
    js_data = extract_data_from_js(resp.text)
    
    # TU BYŁ BŁĄD - teraz jest poprawnie:
    if js_data:
        # NIP
        if js_data.get("nip"): 
            basic_company["nip"] = js_data["nip"]
            print(f"      🔹 Znaleziono NIP (JS): {basic_company['nip']}")

        # OPIS (Priorytet: products > summary > about)
        desc_raw = js_data.get("products") or js_data.get("summary") or js_data.get("about")
        if desc_raw:
            basic_company["desc"] = clean_html_text(desc_raw)
            print(f"      🔹 Znaleziono Opis (JS): {len(basic_company['desc'])} znaków")

        # Email / WWW / Telefon
        contact = js_data.get("contact", {})
        if contact.get("email"): basic_company["email"] = contact["email"]
        if contact.get("www"): basic_company["website"] = contact["www"]
        if contact.get("phone") and contact["phone"].get("number"): 
            basic_company["phone"] = contact["phone"]["number"]

    else:
        # Fallback (Gdyby JS nie zadziałał, choć powinien)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Szukanie NIP w tekście (fallback regex)
        if not basic_company.get("nip"):
            text = soup.get_text()
            nip_match = re.search(r'\b(\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2})\b|\b(\d{10})\b', text)
            if nip_match:
                basic_company["nip"] = nip_match.group(0).replace("-", "").replace(" ", "")

    time.sleep(random.uniform(0.5, 1.2))
    return basic_company



# ===== LISTING SCRAPER =====
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
            
            scripts = soup.find_all("script", type="application/ld+json")
            for s in scripts:
                if not s.string: continue
                try:
                    data = json.loads(s.string)
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if item.get("@type") == "LocalBusiness" or item.get("address"):
                            results.append({
                                "name": item.get("name"),
                                "url": item.get("url"),
                                "address": item.get("address", {}).get("streetAddress"),
                                "city": item.get("address", {}).get("addressLocality"),
                                "zip": item.get("address", {}).get("postalCode"),
                                "category_name": category_name
                            })
                except: pass
        except: pass
        time.sleep(1)
    
    return results

def save_to_db(conn, companies):
    cur = conn.cursor()
    inserted = 0
    updated = 0
    
    for c in companies:
        if not c.get("name"): continue
        
        tenant_id, sub = get_tenant_id_by_category(conn, c.get("category_name", "Inne"))
        slug = slugify(c["name"])[:50]
        
        # Sprawdzamy czy firma istnieje (po NIP lub SLUG)
        existing_id = None
        
        # 1. Szukaj po NIP (jeśli mamy NIP)
        if c.get("nip"):
            cur.execute('SELECT id FROM "Company" WHERE nip=%s', (c["nip"],))
            row = cur.fetchone()
            if row: existing_id = row[0]
            
        # 2. Jeśli nie znaleziono po NIP, szukaj po SLUG w tym tenancie
        if not existing_id:
            cur.execute('SELECT id FROM "Company" WHERE "tenantId"=%s AND slug=%s', (tenant_id, slug))
            row = cur.fetchone()
            if row: existing_id = row[0]

        cat_id = get_or_create_category(conn, tenant_id, c.get("category_name", "Inne"))

        if existing_id:
            # === UPDATE (Aktualizujemy istniejącą firmę) ===
            # Aktualizujemy tylko jeśli mamy nowe dane, a w bazie może ich brakować
            try:
                cur.execute("""
                    UPDATE "Company"
                    SET 
                        nip = COALESCE(nip, %s),
                        description = COALESCE(description, %s),
                        phone = COALESCE(phone, %s),
                        email = COALESCE(email, %s),
                        website = COALESCE(website, %s),
                        address = COALESCE(address, %s),
                        city = COALESCE(city, %s),
                        zip = COALESCE(zip, %s)
                    WHERE id = %s
                """, (
                    c.get("nip"), c.get("desc"), c.get("phone"), c.get("email"), 
                    c.get("website"), c.get("address"), c.get("city"), c.get("zip"),
                    existing_id
                ))
                updated += 1
                # print(f"   🔄 Zaktualizowano: {c['name']}")
            except Exception as e:
                print(f"SQL Update Error: {e}")
                conn.rollback()
        else:
            # === INSERT (Wstawiamy nową firmę) ===
            try:
                cur.execute("""
                    INSERT INTO "Company" (id, "tenantId", name, slug, address, city, zip, phone, email, website, description, "categoryId", plan, "isVerified", nip)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false, %s)
                """, (
                    str(uuid.uuid4()), tenant_id, c["name"], slug, 
                    c.get("address"), c.get("city"), c.get("zip"),
                    c.get("phone"), c.get("email"), c.get("website"),
                    c.get("desc"), cat_id, c.get("nip")
                ))
                inserted += 1
                print(f"   ✅ [->{sub}] Dodano: {c['name']}")
            except Exception as e:
                print(f"SQL Insert Error: {e}")
                conn.rollback()
            
    conn.commit()
    cur.close()
    print(f"💾 Wynik: {inserted} nowych, {updated} zaktualizowanych.")


if __name__ == "__main__":
    conn = connect_db()
    
    # Podaj tu swoje URL
    urls = [
        "https://panoramafirm.pl/mechanika_pojazdowa",
        "https://panoramafirm.pl/biura_rachunkowe"
    ]
    
    for u in urls:
        print(f"\n🚀 Start kategoria: {u}")
        basic_list = scrape_category_listing(u, pages=1)
        
        enriched_list = []
        for i, item in enumerate(basic_list, 1):
            print(f"[{i}/{len(basic_list)}] Pobieram szczegóły: {item['name']}")
            enriched_list.append(enrich_company_from_profile(item))
            
        save_to_db(conn, enriched_list)
        
    conn.close()
