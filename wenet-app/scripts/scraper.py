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

# ===== MAPA KATEGORII DO TENANTÓW (SUBDOMENY) =====
# Klucz: Subdomena (np. mechanicy.twojadomena.pl)
# Wartość: Lista słów kluczowych w kategorii Panoramy Firm
TENANT_MAP = {
    "mechanicy": ["mechanik", "auto", "samochod", "pojazd", "wulkanizacja", "opony", "lakierni", "blachar"],
    "ksiegowi": ["księg", "rachunk", "biuro rachunkowe", "podatk", "audyt", "finans"],
    "budowlanka": ["budow", "remont", "wykończ", "hydraul", "elektryk", "dach", "okna", "drzwi"],
    "lekarze": ["lekarz", "medycz", "przychodnia", "stomatolog", "dentysta", "rehabilit"],
    "fryzjerzy": ["fryzjer", "kosmety", "salon urody", "spa", "wizaż"],
    "prawnicy": ["adwokat", "prawn", "notariusz", "radca", "kancelaria"],
    "transport": ["transport", "przewóz", "spedycja", "logistyk", "kurier", "przeprowadzki"]
}

# Domyślny tenant dla firm, które nie pasują nigdzie (np. "Sklep spożywczy")
DEFAULT_TENANT_SUBDOMAIN = "katalog"

# ===== HTTP =====
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

BASE_URL = "https://panoramafirm.pl"


# ===== BAZA DANYCH =====
def connect_db():
    print("🔌 Łączenie z bazą PostgreSQL...")
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
    # Polskie znaki
    replacements = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 
        'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    
    # Tylko alfanumeryczne i myślniki
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text).strip('-')
    return text

# ===== LOGIKA TENANTÓW (AUTO-ASSIGN) =====
def get_tenant_id_by_category(conn, category_name):
    """
    1. Analizuje nazwę kategorii.
    2. Znajduje pasującą subdomenę w TENANT_MAP.
    3. Pobiera ID tenanta z bazy lub tworzy go, jeśli nie istnieje.
    """
    cat_lower = category_name.lower()
    target_subdomain = DEFAULT_TENANT_SUBDOMAIN
    
    # 1. Dopasowanie po słowach kluczowych
    found = False
    for subdomain, keywords in TENANT_MAP.items():
        if any(k in cat_lower for k in keywords):
            target_subdomain = subdomain
            found = True
            break
            
    # 2. Sprawdzenie w DB
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Tenant" WHERE subdomain = %s', (target_subdomain,))
    row = cur.fetchone()
    
    if row:
        tenant_id = row[0]
    else:
        # 3. Auto-Create Tenant
        print(f"   🆕 Tworzę nowego tenanta: {target_subdomain}")
        tenant_id = str(uuid.uuid4())
        
        # Ładna nazwa wyświetlana: mechanicy -> Katalog Mechaników
        if target_subdomain == DEFAULT_TENANT_SUBDOMAIN:
             display_name = "Katalog Firm"
        else:
             display_name = f"Katalog {target_subdomain.capitalize()}"
             
        cur.execute(
            'INSERT INTO "Tenant" (id, name, subdomain, "createdAt") VALUES (%s, %s, %s, NOW())',
            (tenant_id, display_name, target_subdomain)
        )
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
        cur.execute(
            'INSERT INTO "Category" (id, name, slug, "tenantId") VALUES (%s, %s, %s, %s)', 
            (cat_id, name, slug, tenant_id)
        )
        conn.commit()
    cur.close()
    return cat_id


# ===== PARSOWANIE ADRESU (ULEPSZONE) =====
def parse_raw_address_string(raw_addr):
    """
    Parsuje string typu: 'ul. Prosta 1, 00-100 Warszawa, woj. mazowieckie'
    """
    if not raw_addr: return {}
    
    parsed = {
        "address": raw_addr, # fallback
        "zip": "00-000",
        "city": ""
    }

    # Regex na kod pocztowy XX-XXX
    zip_match = re.search(r'\b(\d{2}-\d{3})\b', raw_addr)
    if zip_match:
        parsed["zip"] = zip_match.group(1)
        
        # Miasto zazwyczaj jest PO kodzie pocztowym
        after_zip = raw_addr[zip_match.end():]
        # Usuwamy ew. wojewodztwo
        if "woj" in after_zip.lower():
            after_zip = re.split(r'woj', after_zip, flags=re.IGNORECASE)[0]
            
        parsed["city"] = after_zip.strip(" ,.").title()
        
        # Ulica to zazwyczaj to, co PRZED kodem
        before_zip = raw_addr[:zip_match.start()].strip(" ,")
        if before_zip:
            parsed["address"] = before_zip
            
    return parsed


# ===== JSON-LD HELPER =====
def extract_company_from_ldjson(entity, category_name=None):
    if not isinstance(entity, dict): return None
    
    # Obsługa grafu (@graph)
    if "@graph" in entity:
        for item in entity["@graph"]:
            res = extract_company_from_ldjson(item, category_name)
            if res: return res
        return None

    if entity.get("@type") not in ["LocalBusiness", "Organization", "AutomotiveBusiness", "MedicalBusiness", "LegalService"]:
        return None

    addr = entity.get("address") or {}
    street = addr.get("streetAddress")
    city = addr.get("addressLocality")
    postal = addr.get("postalCode")
    
    full_address = street or "Brak adresu"

    comp = {
        "name": entity.get("name"),
        "address": full_address,
        "city": city or "",
        "zip": postal or "00-000",
        "phone": entity.get("telephone"),
        "image": entity.get("image"),
        "desc": entity.get("description"),
        "url": entity.get("url"), # To jest URL profilu w PF
        "email": entity.get("email"),
        "website": None,
        "category_name": category_name,
        "source": "json-ld"
    }

    # Wyciąganie website z sameAs
    same_as = entity.get("sameAs")
    website = None
    if isinstance(same_as, list) and same_as:
        website = same_as[0]
    elif isinstance(same_as, str):
        website = same_as
    
    comp["website"] = website
    return comp


# ===== SCRAPING LISTINGU =====
def scrape_category_listing(listing_url, pages=1, category_name=None):
    # Jeśli kategoria nie podana, zgadujemy z URL
    if category_name is None:
        category_name = listing_url.strip("/").split("/")[-1].replace("_", " ").title()

    results = []
    session = requests.Session()
    session.headers.update(HEADERS)

    for page in range(1, pages + 1):
        target_url = listing_url if page == 1 else f"{listing_url}/firmy,{page}.html"
        print(f"🔍 Scrapowanie: {target_url} (Kategoria: {category_name})")

        try:
            resp = session.get(target_url, timeout=20)
            if resp.status_code == 404:
                print("   ❌ Strona 404, koniec.")
                break
            resp.raise_for_status()
        except Exception as e:
            print(f"   ⚠️ Błąd HTTP: {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Pobieramy dane z JSON-LD
        scripts = soup.find_all("script", type="application/ld+json")
        page_companies = []
        
        for script in scripts:
            if not script.string: continue
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        c = extract_company_from_ldjson(item, category_name)
                        if c: page_companies.append(c)
                elif isinstance(data, dict):
                    c = extract_company_from_ldjson(data, category_name)
                    if c: page_companies.append(c)
            except: pass

        # Filtrowanie (musi mieć nazwę)
        valid = [c for c in page_companies if c and c.get('name')]
        print(f"   ✅ Znaleziono {len(valid)} firm na stronie {page}.")
        results.extend(valid)
        
        time.sleep(random.uniform(1.0, 2.0))

    return results


# ===== ENRICH PROFILU (SZCZEGÓŁY) =====
def enrich_company_from_profile(basic_company):
    profile_url = basic_company.get("url")
    if not profile_url: return basic_company

    if not profile_url.startswith("http"):
        profile_url = BASE_URL + "/" + profile_url.lstrip("/")

    try:
        resp = requests.get(profile_url, headers=HEADERS, timeout=15)
        # Ochrona przed przekierowaniem na listing/szukaj
        if "firmy," in resp.url or "/szukaj" in resp.url:
            return basic_company
        resp.raise_for_status()
    except Exception:
        return basic_company

    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Check anty-botowy / lista
    if soup.title and ("lista firm" in soup.title.string.lower() or "znaleziono" in soup.title.string.lower()):
        return basic_company

    candidates = []
    if basic_company.get("desc"): candidates.append(basic_company["desc"])

    # 1. Opisy z sekcji
    for sec_id in ["about-us", "offer", "description"]:
        sec = soup.find(id=sec_id)
        if sec:
            txt = sec.get_text(separator="\n", strip=True).replace("O firmie", "").replace("Oferta", "").strip()
            if len(txt) > 20: candidates.append(txt)

    # 2. Opis z meta description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        content = meta_desc["content"].strip()
        candidates.append(content)
        
        # Fallback adresu z meta
        if basic_company.get("address") == "Brak adresu":
            match = re.search(r',\s*(ul\.[^()]+?)\s*\(woj', content)
            if match: basic_company["address"] = match.group(1).strip()

    # 3. Adres z short-info HTML
    short_info = soup.find("div", class_="company-short-info")
    if short_info:
        strong = short_info.find("strong")
        if strong:
            for br in strong.find_all("br"): br.replace_with("\n")
            lines = strong.get_text().split("\n")
            if len(lines) > 1:
                raw = lines[1].strip()
                if basic_company["address"] == "Brak adresu":
                    parsed = parse_raw_address_string(raw)
                    if parsed.get("city"): basic_company["city"] = parsed["city"]
                    if parsed.get("zip") != "00-000": basic_company["zip"] = parsed["zip"]
                    if parsed.get("address"): basic_company["address"] = parsed["address"]
                    else: basic_company["address"] = raw

    # 4. Email / WWW z buttonów
    email_btn = soup.find("button", attrs={"data-company-email": True})
    if email_btn: basic_company["email"] = email_btn["data-company-email"]

    www_btn = soup.find("button", attrs={"data-onclick-href": True})
    if www_btn and not basic_company.get("website"): basic_company["website"] = www_btn["data-onclick-href"]

    # Wybór najlepszego opisu (bez spamu)
    BAD_PHRASES = ["firm z branży", "Sprawdź listę", "Zdobądź dane", "Wyszukiwarka firm", "baza firm"]
    valid_descs = [d for d in candidates if d and not any(bad.lower() in d.lower() for bad in BAD_PHRASES)]
    
    if valid_descs:
        basic_company["desc"] = sorted(valid_descs, key=len, reverse=True)[0]
    else:
        basic_company["desc"] = None

    time.sleep(random.uniform(0.5, 1.0))
    return basic_company


# ===== ZAPIS (Z AUTO-TENANTEM) =====
def save_companies_to_db(conn, companies):
    cur = conn.cursor()
    inserted = 0
    duplicates = 0
    
    for comp in companies:
        name = comp.get("name")
        if not name: continue
        
        # 1. Określ tenanta na podstawie kategorii
        cat_name = comp.get("category_name") or "Inne"
        tenant_id, tenant_subdomain = get_tenant_id_by_category(conn, cat_name)
        
        # 2. Sprawdź duplikat w ramach TEGO tenanta
        slug = slugify(name)[:50] # czasem nazwy są za długie na slug
        
        cur.execute('SELECT id FROM "Company" WHERE "tenantId"=%s AND slug=%s', (tenant_id, slug))
        if cur.fetchone():
            duplicates += 1
            continue

        # 3. Kategoria i Firma
        cat_id = get_or_create_category(conn, tenant_id, cat_name)
        comp_id = str(uuid.uuid4())
        
        try:
            cur.execute("""
                INSERT INTO "Company" 
                (id, "tenantId", name, slug, address, city, zip, phone, email, website, description, logo, "categoryId", plan, "isVerified")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false)
            """, (
                comp_id, tenant_id, name, slug, 
                comp.get("address"), comp.get("city"), comp.get("zip"),
                comp.get("phone"), comp.get("email"), comp.get("website"),
                comp.get("desc"), comp.get("image"), cat_id
            ))
            inserted += 1
            print(f"   ✅ [-> {tenant_subdomain}] Zapisano: {name}")
        except Exception as e:
            print(f"   ⚠️ Błąd SQL: {e}")
            conn.rollback()
            continue
            
    conn.commit()
    cur.close()
    print(f"💾 Sesja zakończona. Dodano: {inserted}, Duplikaty: {duplicates}")


# ===== URUCHOMIENIE =====
if __name__ == "__main__":
    conn = connect_db()
    
    # PRZYKŁAD UŻYCIA: Możesz tu dodać listę URL-i do przejechania
    urls_to_scrape = [
        "https://panoramafirm.pl/mechanika_pojazdowa",
        "https://panoramafirm.pl/biura_rachunkowe",
        # "https://panoramafirm.pl/uslugi_remontowe",
    ]
    
    for url in urls_to_scrape:
        print(f"\n🚀 START DLA: {url}")
        companies = scrape_category_listing(url, pages=2) # Zbieramy 2 strony na test
        
        enriched = []
        for i, c in enumerate(companies, 1):
            print(f"[{i}/{len(companies)}] Enrich: {c.get('name')}")
            enriched.append(enrich_company_from_profile(c))
            
        if enriched:
            save_companies_to_db(conn, enriched)
        else:
            print("⚪ Pusto.")
            
    conn.close()
    print("\n🏁 KONIEC PRACY SCRAPERA.")
