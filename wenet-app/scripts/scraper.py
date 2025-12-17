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
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        connect_timeout=10,
    )
    return conn


def get_tenant_id(conn, subdomain):
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Tenant" WHERE subdomain = %s', (subdomain,))
    row = cur.fetchone()
    cur.close()
    if not row:
        raise RuntimeError(f"Brak tenanta o subdomenie '{subdomain}' w tabeli Tenant.")
    return row[0]


def slugify(text):
    if not text:
        return ""
    repl = {
        "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
        "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    }
    text = text.lower()
    for k, v in repl.items():
        text = text.replace(k, v)
    
    # Usuwamy znaki specjalne, zostawiamy litery, cyfry i myślniki
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text).strip('-')
    return text


def get_or_create_category(conn, tenant_id, name):
    slug = slugify(name)
    cur = conn.cursor()
    cur.execute(
        'SELECT id FROM "Category" WHERE "tenantId" = %s AND slug = %s',
        (tenant_id, slug),
    )
    row = cur.fetchone()
    if row:
        cat_id = row[0]
    else:
        cat_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO "Category" (id, name, slug, "tenantId") VALUES (%s, %s, %s, %s)',
            (cat_id, name, slug, tenant_id),
        )
        conn.commit()
        print(f"🆕 Utworzono kategorię: {name} (slug: {slug})")
    cur.close()
    return cat_id


# ===== PARSOWANIE ADRESU =====
def parse_raw_address_string(raw_addr):
    """
    Próbuje wyciągnąć zip, city, street z surowego stringa typu:
    'ul. Watoły 13, 41-106 Siemianowice Śląskie woj: śląskie'
    """
    if not raw_addr:
        return {}
    
    parsed = {
        "address": raw_addr, # fallback
        "zip": "00-000",
        "city": ""
    }

    # Szukamy kodu pocztowego XX-XXX
    zip_match = re.search(r'\b(\d{2}-\d{3})\b', raw_addr)
    if zip_match:
        parsed["zip"] = zip_match.group(1)
        
        # Często miasto jest zaraz po kodzie pocztowym
        after_zip = raw_addr[zip_match.end():]
        # usuwamy ew. "woj: ..."
        if "woj:" in after_zip:
            after_zip = after_zip.split("woj:")[0]
        elif "woj." in after_zip:
            after_zip = after_zip.split("woj.")[0]
            
        parsed["city"] = after_zip.strip(" ,.").title()
        
        # Ulica to zazwyczaj to co przed kodem
        before_zip = raw_addr[:zip_match.start()].strip(" ,")
        if before_zip:
            parsed["address"] = before_zip

    return parsed


# ===== JSON-LD LocalBusiness =====
def extract_company_from_ldjson(entity, category_name=None):
    if not isinstance(entity, dict):
        return None
    
    if "@graph" in entity:
        for item in entity["@graph"]:
            res = extract_company_from_ldjson(item, category_name)
            if res: return res
        return None

    if entity.get("@type") not in ["LocalBusiness", "Organization", "AutomotiveBusiness"]: 
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
        "url": entity.get("url"), 
        "email": entity.get("email"),
        "website": None,
        "category_name": category_name,
        "source": "json-ld"
    }

    same_as = entity.get("sameAs")
    website = None
    if isinstance(same_as, list) and same_as:
        website = same_as[0]
    elif isinstance(same_as, str):
        website = same_as
    
    comp["website"] = website
    return comp


# ===== LISTING BRANŻY =====
def scrape_category_listing(listing_url, pages=1, category_name=None):
    if category_name is None:
        category_name = listing_url.rsplit("/", 1)[-1]

    results = []
    session = requests.Session()
    session.headers.update(HEADERS)

    for page in range(1, pages + 1):
        target_url = listing_url if page == 1 else f"{listing_url}/firmy,{page}.html"
        print(f"🔍 Scrapowanie: {target_url}")

        try:
            resp = session.get(target_url, timeout=20)
            if resp.status_code == 404:
                print("   ❌ Strona 404, koniec.")
                break
            resp.raise_for_status()
        except Exception as e:
            print(f"   ⚠️ Błąd: {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        
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

        page_companies = [c for c in page_companies if c and c['name']]
        print(f"   ✅ Znaleziono {len(page_companies)} firm (JSON-LD) na stronie {page}.")
        results.extend(page_companies)
        time.sleep(random.uniform(1.0, 2.5))

    return results


# ===== ENRICH PROFILU (POPRAWIONY DESC) =====
def enrich_company_from_profile(basic_company):
    profile_url = basic_company.get("url")
    if not profile_url:
        return basic_company

    if not profile_url.startswith("http"):
        profile_url = BASE_URL + "/" + profile_url.lstrip("/")

    # print(f"   ↪️ Wchodzę w profil: {profile_url}")

    try:
        resp = requests.get(profile_url, headers=HEADERS, timeout=20)
        # Ochrona przed przekierowaniem na listing
        if "firmy," in resp.url or "/szukaj" in resp.url:
            return basic_company
        resp.raise_for_status()
    except Exception as e:
        print(f"     ⚠️ Błąd profilu: {e}")
        return basic_company

    soup = BeautifulSoup(resp.text, "html.parser")

    # Czy to nie jest listing?
    page_title = soup.title.string if soup.title else ""
    if "lista firm" in page_title.lower() or "znaleziono" in page_title.lower():
         return basic_company
    
    candidates = []

    # 1. Istniejący opis
    if basic_company.get("desc"):
        candidates.append(basic_company["desc"])

    # 2. Sekcje dedykowane (HTML)
    for sec_id in ["about-us", "offer", "description"]:
        section = soup.find(id=sec_id)
        if section:
            text = section.get_text(separator="\n", strip=True)
            text = text.replace("O firmie", "").replace("Oferta", "").strip()
            if len(text) > 20: 
                candidates.append(text)

    # 3. Klasa .section-content
    section_content = soup.find("div", class_="section-content")
    if section_content:
        candidates.append(section_content.get_text(separator="\n", strip=True))

    # 4. Meta Description (z weryfikacją)
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        content = meta_desc["content"].strip()
        candidates.append(content)
        
        # Fallback adresu z meta (jeśli brak)
        if basic_company.get("address") == "Brak adresu":
            match = re.search(r',\s*(ul\.[^()]+?)\s*\(woj', content)
            if match:
                basic_company["address"] = match.group(1).strip()

    # 5. Adres z HTML (Company Short Info)
    short_info = soup.find("div", class_="company-short-info")
    if short_info:
        strong_tag = short_info.find("strong")
        if strong_tag:
            for br in strong_tag.find_all("br"):
                br.replace_with("\n")
            lines = strong_tag.get_text().split("\n")
            
            if len(lines) > 0 and not basic_company.get("name"):
                 basic_company["name"] = lines[0].strip()
            
            if len(lines) > 1:
                raw_addr = lines[1].strip()
                if basic_company["address"] == "Brak adresu":
                    parsed = parse_raw_address_string(raw_addr)
                    if parsed.get("city"): basic_company["city"] = parsed["city"]
                    if parsed.get("zip") != "00-000": basic_company["zip"] = parsed["zip"]
                    if parsed.get("address"): basic_company["address"] = parsed["address"]
                    else: basic_company["address"] = raw_addr

    # 6. E-mail i WWW
    email_btn = soup.find("button", attrs={"data-company-email": True})
    if email_btn: basic_company["email"] = email_btn["data-company-email"]

    www_btn = soup.find("button", attrs={"data-onclick-href": True})
    if www_btn and not basic_company.get("website"): basic_company["website"] = www_btn["data-onclick-href"]


    # === FILTR ANTY-SPAMOWY DLA OPISU ===
    BAD_PHRASES = [
        "firm z branży", 
        "Sprawdź listę najlepszych", 
        "Zdobądź dane kontaktowe", 
        "poznaj opinie w serwisie",
        "Wyszukiwarka firm",
        "baza firm",
        "firm w branży"
    ]

    valid_descriptions = []
    for desc in candidates:
        if not desc: continue
        # Sprawdzamy czy opis zawiera "złe frazy"
        if any(bad.lower() in desc.lower() for bad in BAD_PHRASES):
            continue
        valid_descriptions.append(desc)

    if valid_descriptions:
        # Wybieramy najdłuższy z poprawnych
        best_desc = sorted(valid_descriptions, key=len, reverse=True)[0]
        basic_company["desc"] = best_desc
    else:
        # Jeśli zostały tylko śmieciowe opisy -> czyścimy
        basic_company["desc"] = None

    time.sleep(random.uniform(0.5, 1.2))
    return basic_company


# ===== ZAPIS DO BAZY =====
def save_companies_to_db(conn, tenant_id, companies):
    cur = conn.cursor()
    inserted = 0
    duplicates = 0
    
    for comp in companies:
        if not comp.get("name"): continue
        
        name = comp["name"]
        slug = slugify(name)
        city = comp.get("city") or ""
        
        # Deduplikacja po slug (prosta)
        cur.execute(
            'SELECT id FROM "Company" WHERE "tenantId"=%s AND slug=%s', 
            (tenant_id, slug)
        )
        if cur.fetchone():
            duplicates += 1
            continue

        cat_name = comp.get("category_name") or "Inne"
        cat_id = get_or_create_category(conn, tenant_id, cat_name)
        
        comp_id = str(uuid.uuid4())
        
        try:
            cur.execute("""
                INSERT INTO "Company" 
                (id, "tenantId", name, slug, address, city, zip, phone, email, website, description, logo, "categoryId", plan, "isVerified")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'FREE', false)
            """, (
                comp_id, tenant_id, name, slug, 
                comp.get("address"), city, comp.get("zip"),
                comp.get("phone"), comp.get("email"), comp.get("website"),
                comp.get("desc"), comp.get("image"), cat_id
            ))
            inserted += 1
        except Exception as e:
            print(f"   ⚠️ Błąd SQL: {e}")
            conn.rollback()
            continue
            
    conn.commit()
    cur.close()
    print(f"💾 Zapisano: {inserted}, Duplikaty: {duplicates}")


# ===== URUCHOMIENIE =====
if __name__ == "__main__":
    conn = connect_db()
    
    # 1. Pobierz ID tenanta
    try:
        t_id = get_tenant_id(conn, "mechanicy") 
    except:
        print("❌ Brak tenanta 'mechanicy'. Utwórz go w bazie najpierw.")
        exit(1)
        
    # 2. Testowo jedna branża (możesz zmienić URL)
    cat_url = "https://panoramafirm.pl/biura_rachunkowe"
    print(f"🚀 Start dla: {cat_url}")
    
    companies = scrape_category_listing(cat_url, pages=1)
    
    enriched_companies = []
    for c in companies:
        enriched_companies.append(enrich_company_from_profile(c))
        
    save_companies_to_db(conn, t_id, enriched_companies)
    conn.close()
