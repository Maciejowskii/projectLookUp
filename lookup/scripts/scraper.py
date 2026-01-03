# scraper_panoramafirm_insert_only.py

import os
import re
import json
import uuid
import time
import random
import warnings
from urllib.parse import unquote, urlparse

import requests
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI


warnings.simplefilter(action="ignore", category=FutureWarning)
load_dotenv()

# =========================
# KONFIG / ENV
# =========================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")

SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()  # MAIN / TEST
USE_AI_REWRITE = (SCRAPER_MODE == "MAIN") and bool(OPENAI_API_KEY)

SCRAPE_ALL_CATEGORIES = os.getenv("SCRAPE_ALL_CATEGORIES", "false").upper() == "TRUE"

MAX_TOTAL_COMPANIES = int(os.getenv("MAX_TOTAL_COMPANIES", "10000"))
MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "5"))
MAX_CATEGORIES = int(os.getenv("MAX_CATEGORIES", "10"))

MAX_AI_REQUESTS = int(os.getenv("MAX_AI_REQUESTS", "5000"))
AI_PAUSE_HOURS = int(os.getenv("AI_PAUSE_HOURS", "12"))

# jeśli opis z profilu jest krótszy niż to, to robimy seed z name+category+city
MIN_RAW_DESC_FOR_DIRECT_USE = int(os.getenv("MIN_RAW_DESC_FOR_DIRECT_USE", "50"))
# minimalna długość opisu wynikowego (AI)
MIN_AI_DESC_LEN = int(os.getenv("MIN_AI_DESC_LEN", "400"))

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

BASE_URL = "https://panoramafirm.pl"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
}

TENANT_MAP = {
    "mechanicy": ["mechanik", "auto", "samochod", "pojazd", "wulkanizacja", "opony", "lakiernia", "warsztat"],
    "ksiegowi": ["księg", "rachunk", "biuro rachunkowe", "podatk", "audyt", "finans"],
    "budowlanka": ["budow", "remont", "wykończe", "hydraul", "elektryk", "dach", "okna", "drzwi"],
    "lekarze": ["lekarz", "medyc", "przychodnia", "stomatolog", "dentysta", "rehabilitacja"],
    "fryzjerzy": ["fryzjer", "kosmetyk", "salon urody", "spa"],
    "prawnicy": ["adwokat", "prawnik", "notariusz", "radca prawny"],
    "transport": ["transport", "przewóz", "spedycja", "logistyka", "kurier"],
    "serwis_agd": ["agd", "pralka", "lodówka", "zmywarka", "naprawa", "serwis"],
}
DEFAULT_TENANT_SUBDOMAIN = "katalog"

# =========================
# RUNTIME
# =========================
ai_usage_counter = 0
total_inserted = 0
client = None


def log(msg: str):
    print(msg, flush=True)


# =========================
# DB
# =========================
def connect_db():
    if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS]):
        raise RuntimeError("Brak DB creds w .env (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS)")
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
    )


# =========================
# HELPERS
# =========================
def slugify(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    replacements = {"ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z"}
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s-]+", "-", text).strip("-")[:60]


def normalize_category_name_from_url(url: str) -> str:
    base = os.path.basename(url.rstrip("/"))
    base = unquote(base).replace("_", " ").strip()
    return (base[:1].upper() + base[1:]) if base else "Inne"


def clean_html_text(html_text: str) -> str:
    if not html_text:
        return ""
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(separator="\n").strip()


def safe_url(url: str) -> str | None:
    if not url:
        return None
    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url
    if url.startswith("/"):
        url = BASE_URL + url
    if not url.startswith("http"):
        return None
    return url


def normalize_website(url: str | None) -> str | None:
    if not url:
        return None
    url = url.strip()
    if not url:
        return None
    if url.startswith("//"):
        url = "https:" + url
    if not url.startswith("http"):
        url = "https://" + url
    try:
        p = urlparse(url)
        host = (p.netloc or "").lower()
        host = host[4:] if host.startswith("www.") else host
        if not host:
            return None
        return f"https://{host}"
    except Exception:
        return None


def extract_company_variable(html_content: str) -> dict | None:
    start_marker = "var company ="
    start_idx = html_content.find(start_marker)
    if start_idx == -1:
        return None

    json_start = html_content.find("{", start_idx)
    if json_start == -1:
        return None

    bracket_count = 0
    in_string = False
    escape = False

    for i in range(json_start, len(html_content)):
        char = html_content[i]

        if char == '"' and not escape:
            in_string = not in_string

        if not in_string:
            if char == "{":
                bracket_count += 1
            elif char == "}":
                bracket_count -= 1
                if bracket_count == 0:
                    raw = html_content[json_start : i + 1]
                    try:
                        return json.loads(raw)
                    except Exception:
                        return None

        if char == "\\" and not escape:
            escape = True
        else:
            escape = False

    return None


# =========================
# TENANT / CATEGORY
# =========================
def get_tenant_id_by_category(conn, category_name: str):
    cat_lower = (category_name or "").lower()
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
        cur.execute(
            'INSERT INTO "Tenant" (id, name, subdomain, "createdAt") VALUES (%s, %s, %s, NOW())',
            (tenant_id, name, target_subdomain),
        )
        conn.commit()

    cur.close()
    return tenant_id, target_subdomain


def get_or_create_category(conn, tenant_id: str, name: str):
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
            (cat_id, name, slug, tenant_id),
        )
        conn.commit()

    cur.close()
    return cat_id


# =========================
# DEDUPE (INSERT-ONLY)
# =========================
def company_exists(conn, tenant_id: str, nip: str | None, website: str | None, base_slug: str) -> bool:
    """
    INSERT-ONLY: jeśli istnieje po NIP lub website lub (tenantId, slug), skipujemy.
    """
    cur = conn.cursor()

    if nip:
        cur.execute(
            'SELECT 1 FROM "Company" WHERE "tenantId" = %s AND nip = %s LIMIT 1',
            (tenant_id, str(nip)),
        )
        if cur.fetchone():
            cur.close()
            return True

    if website:
        cur.execute(
            'SELECT 1 FROM "Company" WHERE "tenantId" = %s AND website = %s LIMIT 1',
            (tenant_id, website),
        )
        if cur.fetchone():
            cur.close()
            return True

    if base_slug:
        cur.execute(
            'SELECT 1 FROM "Company" WHERE "tenantId" = %s AND slug = %s LIMIT 1',
            (tenant_id, base_slug),
        )
        if cur.fetchone():
            cur.close()
            return True

    cur.close()
    return False


def get_unique_slug(conn, tenant_id: str, base_name: str) -> str:
    base_slug = slugify(base_name) or "firma"
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


# =========================
# OPENAI
# =========================
def init_openai():
    global client
    if client is not None:
        return True
    if not OPENAI_API_KEY:
        return False
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        return True
    except Exception as e:
        log(f"OpenAI init error: {e}")
        return False


def rewrite_description_with_ai(source_text: str, company_name: str, category_name: str, city: str | None):
    global ai_usage_counter

    if not USE_AI_REWRITE:
        return None

    if ai_usage_counter >= MAX_AI_REQUESTS:
        log(f"Limit AI ({MAX_AI_REQUESTS}) osiągnięty. Pauza {AI_PAUSE_HOURS}h...")
        time.sleep(AI_PAUSE_HOURS * 3600)
        ai_usage_counter = 0

    if not init_openai():
        return None

    city_txt = (city or "").strip() or "Polska"

    prompt = f"""
Napisz unikalny opis firmy do katalogu lokalnych usług.

JĘZYK I FORMA:
- Język: polski.
- Zwróć WYŁĄCZNIE gotowy opis jako PLAIN TEXT.
- Format: 5–7 krótkich akapitów; między akapitami ZAWSZE jedna pusta linia (czyli podwójny enter).
- Brak list punktowanych i numerowanych.
- Brak nagłówków typu „O firmie”, brak emoji.
- Nie kończ tekstu zwrotami: „Zapraszamy do kontaktu”, „Skontaktuj się”, „Zadzwoń”, itp.

DŁUGOŚĆ:
- 900–1400 znaków (ze spacjami).

SEO (NATURALNIE, BEZ SPAMU):
- W pierwszym akapicie użyj: nazwy firmy {company_name}, kategorii/usługi {category_name}, lokalizacji {city} oraz 1–2 fraz pokrewnych.
- W całym tekście użyj łącznie 6–10 fraz powiązanych (synonimy/odmiany), ale bez sztucznego powtarzania.
- Nie wymyślaj konkretnych faktów, których nie ma w źródle (np. „od 1992”, liczby instruktorów, certyfikaty), chyba że występują w materiale.

STYL:
- Rzeczowy, „eye‑catching” przez rytm: krótkie zdania, konkret, przyjazny ton.
- Zero marketingowego bełkotu: bez „najlepsi”, „lider”, „bezkonkurencyjni”.
- Użyj 1–2 zdań wyróżniających podejście/standard pracy (ale ogólnie, bez zmyślania).

STRUKTURA AKAPITÓW:
1) 2–3 zdania: kim jest {company_name} + {city} + główna usługa + dla kogo.
2) Zakres usług: konkretne czynności/usługi typowe dla {category_name}.
3) Problemy/cele klienta: co to rozwiązuje i w jakich sytuacjach pomaga.
4) Jak wygląda współpraca/proces: krok po kroku w narracji (bez list).
5) Jakość/bezpieczeństwo/standardy: co jest ważne w realizacji.
6) Lokalnie: obsługiwany obszar ({city} i okolice) i kiedy to jest wygodne dla klienta.

MATERIAŁ ŹRÓDŁOWY (nie kopiuj, streszczaj i przerabiaj):
{source_text}

Wygeneruj wyłącznie opis.
""".strip()

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "Jesteś doświadczonym copywriterem SEO. Pisz po polsku."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=650,
            temperature=0.7,
        )
        ai_usage_counter += 1
        text = (resp.choices[0].message.content or "").strip()
        return text if len(text) >= MIN_AI_DESC_LEN else None
    except Exception as e:
        log(f"OpenAI error: {e}")
        return None


def fallback_description_no_ai(company_name: str, category_name: str, city: str | None) -> str:
    city_txt = (city or "").strip()
    loc = f"w {city_txt} i okolicach" if city_txt else "w Polsce"
    text = (
        f"{company_name} to firma działająca {loc}, związana z branżą {category_name}. "
        f"W ramach codziennej działalności realizowane są usługi typowe dla tej kategorii, z naciskiem na dopasowanie do potrzeb klienta "
        f"oraz sprawną organizację zlecenia.\n\n"
        f"Zakres prac może obejmować zarówno standardowe realizacje, jak i zadania wymagające indywidualnego podejścia. "
        f"Kluczowe jest jasne ustalenie oczekiwań, dobór odpowiedniego rozwiązania oraz wykonanie usługi w sposób uporządkowany i przewidywalny.\n\n"
        f"Oferta jest kierowana do osób prywatnych i firm, które szukają wykonawcy w kategorii {category_name} oraz cenią rzetelność "
        f"i prostą komunikację. Lokalny charakter działalności ułatwia obsługę klientów z regionu."
    )
    return text[:1200]


# =========================
# SCRAPING
# =========================
def scrape_all_categories():
    categories = []
    popular = [
        "https://panoramafirm.pl/papier",
        "https://panoramafirm.pl/folie_i_foliowanie",
        "https://panoramafirm.pl/kursy_jazdy",
        "https://panoramafirm.pl/agencje_artystyczne",
        "https://panoramafirm.pl/agencje_modelek",
        "https://panoramafirm.pl/architekci",
        "https://panoramafirm.pl/biura_projektowe",
        "https://panoramafirm.pl/biura_tlumaczen",
        "https://panoramafirm.pl/drukarnie",
        "https://panoramafirm.pl/automaty_do_gier",
        "https://panoramafirm.pl/artyku%C5%82y_zoologiczne",
    ]

    for url in popular:
        categories.append({"name": normalize_category_name_from_url(url), "url": url})

    if SCRAPE_ALL_CATEGORIES:
        log("Pobieram dodatkowe kategorie...")
        try:
            resp = requests.get(f"{BASE_URL}/biuro", headers=HEADERS, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.select("a.dropdown-item[href*='/branze.html']"):
                href = link.get("href", "")
                title = link.get_text(strip=True)
                if href and title:
                    categories.append({"name": title, "url": f"{BASE_URL}{href.replace('/branze.html', '')}"})
        except Exception as e:
            log(f"Błąd pobierania kategorii: {e}")

    seen = set()
    unique = []
    for cat in categories:
        if cat["url"] in seen:
            continue
        seen.add(cat["url"])
        unique.append(cat)

    return unique[:MAX_CATEGORIES]


def scrape_category_listing(listing_url: str, pages: int):
    pages = min(pages, MAX_PAGES_PER_CATEGORY)
    results = []

    session = requests.Session()
    session.headers.update(HEADERS)

    for page in range(1, pages + 1):
        url = f"{listing_url}/firmy,{page}.html" if page > 1 else listing_url
        log(f"  Listing page {page}: {url}")

        try:
            resp = session.get(url, timeout=20)
            if resp.status_code != 200:
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.select("h2 a.company-name, a.company-name"):
                href = link.get("href")
                name = link.get_text(strip=True)
                if href and name:
                    results.append({"name": name, "url": href})
        except Exception as e:
            log(f"  Listing error: {e}")

        time.sleep(random.uniform(1.0, 2.0))

    dedup = {}
    for r in results:
        dedup[r["url"]] = r
    return list(dedup.values())


def fetch_company_js(session: requests.Session, company_url: str) -> dict | None:
    url = safe_url(company_url)
    if not url:
        return None
    try:
        resp = session.get(url, timeout=20)
        resp.raise_for_status()
        return extract_company_variable(resp.text)
    except Exception:
        return None


def parse_company_from_js(js_data: dict) -> dict:
    data = {}

    contact = js_data.get("contact") or {}
    data["email"] = contact.get("email")
    data["website"] = normalize_website(contact.get("www"))

    phone = contact.get("phone")
    if isinstance(phone, dict):
        data["phone"] = phone.get("formatted") or phone.get("number")
    else:
        data["phone"] = phone

    loc = js_data.get("location") or {}
    city = loc.get("city")
    data["city"] = city.get("name") if isinstance(city, dict) else city

    street = loc.get("street")
    if isinstance(street, dict):
        name = (street.get("name") or "").strip()
        number = (street.get("number") or "").strip()
        data["address"] = f"{name} {number}".strip() if name or number else None
    else:
        data["address"] = street

    data["zip"] = loc.get("zip")
    prov = loc.get("province")
    data["province"] = prov if isinstance(prov, str) else None

    coords = loc.get("coordinates")
    if isinstance(coords, dict):
        data["lat"] = coords.get("lat")
        data["lng"] = coords.get("lon")

    parts = []
    for field in ["announcementBrief", "products", "summary"]:
        txt = clean_html_text(js_data.get(field)).strip()
        if len(txt) >= 10:
            parts.append(txt)

    data["raw_desc"] = "\n\n".join(parts).strip()
    return data


# =========================
# INSERT (DO NOTHING)
# =========================
def insert_company_do_nothing(conn, payload: dict) -> bool:
    """
    Zwraca True jeśli wstawiono, False jeśli konflikt i nic nie zrobiono.
    """
    cur = conn.cursor()
    sql = """
    INSERT INTO "Company"
    (id, "tenantId", name, slug, address, city, province, zip, phone, email, website,
     description, "categoryId", plan, "isVerified", nip, lat, lng, "createdAt", "updatedAt")
    VALUES
    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
     %s, %s, 'FREE', false, %s, %s, %s, NOW(), NOW())
    ON CONFLICT ("tenantId", slug) DO NOTHING
    RETURNING id;
    """

    cur.execute(
        sql,
        (
            payload.get("id") or str(uuid.uuid4()),
            payload["tenantId"],
            payload["name"],
            payload["slug"],
            payload.get("address"),
            payload.get("city"),
            payload.get("province"),
            payload.get("zip"),
            payload.get("phone"),
            payload.get("email"),
            payload.get("website"),
            payload.get("description"),
            payload["categoryId"],
            payload.get("nip"),
            payload.get("lat"),
            payload.get("lng"),
        ),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return row is not None


# =========================
# PIPELINE (INSERT-ONLY)
# =========================
def process_company(conn, session: requests.Session, listing_item: dict, category_name: str) -> bool:
    global total_inserted

    if total_inserted >= MAX_TOTAL_COMPANIES:
        return False

    name = (listing_item.get("name") or "").strip()
    if not name:
        return False

    tenant_id, tenant_subdomain = get_tenant_id_by_category(conn, category_name)
    category_id = get_or_create_category(conn, tenant_id, category_name)

    js_data = fetch_company_js(session, listing_item.get("url"))
    if not js_data:
        return False

    parsed = parse_company_from_js(js_data)
    raw_desc = parsed.get("raw_desc") or ""
    city = parsed.get("city")
    website = parsed.get("website")

    # jeśli kiedyś dodasz ekstrakcję NIP, ustaw tu
    nip = None

    base_slug = slugify(name)

    # INSERT-ONLY: jeśli istnieje (NIP/website/slug), skipujemy i nie generujemy AI
    if company_exists(conn, tenant_id, nip=nip, website=website, base_slug=base_slug):
        log(f"  Skip (exists) [{tenant_subdomain}] {name[:60]}")
        return False

    # unikamy konfliktów slug wewnątrz tenant
    slug = get_unique_slug(conn, tenant_id, name)

    # materiał do opisu
    if len(raw_desc.strip()) < MIN_RAW_DESC_FOR_DIRECT_USE:
        source_text = f"Firma: {name}. Kategoria: {category_name}. Lokalizacja: {city or 'Polska'}."
    else:
        source_text = raw_desc

    description = None
    if USE_AI_REWRITE:
        description = rewrite_description_with_ai(
            source_text=source_text,
            company_name=name,
            category_name=category_name,
            city=city,
        )

    if not description:
        description = fallback_description_no_ai(name, category_name, city)

    payload = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "categoryId": category_id,
        "name": name,
        "slug": slug,
        "description": description,
        "address": parsed.get("address"),
        "city": city,
        "province": parsed.get("province"),
        "zip": parsed.get("zip"),
        "phone": parsed.get("phone"),
        "email": parsed.get("email"),
        "website": website,
        "nip": nip,
        "lat": parsed.get("lat"),
        "lng": parsed.get("lng"),
    }

    inserted = insert_company_do_nothing(conn, payload)
    if inserted:
        total_inserted += 1
        log(f"  INSERT OK [{tenant_subdomain}] {name[:60]} | slug={slug} | desc={len(description)}")
        return True

    # teoretycznie może się zdarzyć race/duplikat slug -> DO NOTHING
    log(f"  INSERT SKIPPED (conflict) [{tenant_subdomain}] {name[:60]} | slug={slug}")
    return False


def main():
    log(
        f"Mode={SCRAPER_MODE} | AI={'ON' if USE_AI_REWRITE else 'OFF'} | "
        f"MAX_TOTAL_COMPANIES={MAX_TOTAL_COMPANIES} | MAX_AI_REQUESTS={MAX_AI_REQUESTS}"
    )

    conn = connect_db()
    categories = scrape_all_categories()
    log(f"Kategorie: {len(categories)} (max {MAX_CATEGORIES})")

    session = requests.Session()
    session.headers.update(HEADERS)

    try:
        for i, cat in enumerate(categories, 1):
            if total_inserted >= MAX_TOTAL_COMPANIES:
                break

            cat_name = cat["name"]
            cat_url = cat["url"]
            log(f"\n[{i}/{len(categories)}] Category: {cat_name} -> {cat_url}")

            companies = scrape_category_listing(cat_url, pages=MAX_PAGES_PER_CATEGORY)
            log(f"  Listing items: {len(companies)}")

            for j, item in enumerate(companies, 1):
                if total_inserted >= MAX_TOTAL_COMPANIES:
                    break

                log(f"  ({j}/{len(companies)}) {item.get('name','')[:60]}")
                process_company(conn, session, item, category_name=cat_name)
                time.sleep(random.uniform(0.6, 1.2))

            time.sleep(random.uniform(1.5, 2.5))
    finally:
        conn.close()

    log(f"\nDONE. Inserted={total_inserted} | AI used={ai_usage_counter}")


if __name__ == "__main__":
    main()
