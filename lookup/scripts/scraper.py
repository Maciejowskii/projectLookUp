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
import httpx  # Potrzebne dla OpenAI >= 1.0 jeśli używasz proxy
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


warnings.simplefilter(action="ignore", category=FutureWarning)
load_dotenv()


# =========================
# KONFIG / ENV
# =========================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano").strip()

SCRAPER_MODE = os.getenv("SCRAPER_MODE", "MAIN").upper()  # MAIN / TEST
REQUIRE_AI = os.getenv("REQUIRE_AI", "true").lower() == "true"

# AI rewrite tylko w MAIN
USE_AI_REWRITE = (SCRAPER_MODE == "MAIN")

SCRAPE_ALL_CATEGORIES = os.getenv("SCRAPE_ALL_CATEGORIES", "false").upper() == "TRUE"
MAX_PAGES_PER_CATEGORY = int(os.getenv("MAX_PAGES_PER_CATEGORY", "0"))  # 0 = bez limitu

# AI
MAX_AI_REQUESTS = int(os.getenv("MAX_AI_REQUESTS", "5000"))
AI_PAUSE_HOURS = int(os.getenv("AI_PAUSE_HOURS", "12"))
AI_RETRY_CHECK_SECONDS = int(os.getenv("AI_RETRY_CHECK_SECONDS", "3600"))
AI_MAX_RETRIES_PER_COMPANY = int(os.getenv("AI_MAX_RETRIES_PER_COMPANY", "8"))
AI_BACKOFF_INITIAL = float(os.getenv("AI_BACKOFF_INITIAL", "2"))
AI_BACKOFF_MAX = float(os.getenv("AI_BACKOFF_MAX", "60"))

MIN_RAW_DESC_FOR_DIRECT_USE = int(os.getenv("MIN_RAW_DESC_FOR_DIRECT_USE", "50"))
MIN_AI_DESC_LEN = int(os.getenv("MIN_AI_DESC_LEN", "400"))

# HTTP pacing
REQUEST_DELAY_MIN = float(os.getenv("REQUEST_DELAY_MIN", "0.6"))
REQUEST_DELAY_MAX = float(os.getenv("REQUEST_DELAY_MAX", "1.2"))
LISTING_DELAY_MIN = float(os.getenv("LISTING_DELAY_MIN", "1.0"))
LISTING_DELAY_MAX = float(os.getenv("LISTING_DELAY_MAX", "2.0"))

# API retry (PanoramaFirm)
HTTP_MAX_RETRIES = int(os.getenv("HTTP_MAX_RETRIES", "6"))
HTTP_BACKOFF_INITIAL = float(os.getenv("HTTP_BACKOFF_INITIAL", "1.0"))
HTTP_BACKOFF_MAX = float(os.getenv("HTTP_BACKOFF_MAX", "30"))

# DB
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


def normalize_text(s: str) -> str:
    s = (s or "").strip()  # tylko białe znaki
    if re.search(r"%[0-9A-Fa-f]{2}", s):
        s = unquote(s)

    # ujednolicaj, ale nie usuwaj cudzysłowów
    s = s.replace("“", '"').replace("”", '"').replace("„", '"').replace("’", "'")

    s = re.sub(r"\s+", " ", s).strip()
    return s


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
    if not raw:
        return None
    s = raw.strip().lower()
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"\s+", "-", s)  # np. "kujawsko pomorskie"
    return s if s in CANONICAL_VOIVODESHIPS else None


# =========================
# REQUESTS (retry + backoff)
# =========================
def http_get_with_backoff(session: requests.Session, url: str, timeout: int = 20) -> requests.Response:
    delay = HTTP_BACKOFF_INITIAL
    last_exc = None

    for attempt in range(1, HTTP_MAX_RETRIES + 1):
        try:
            resp = session.get(url, timeout=timeout)

            if resp.status_code in (429, 500, 502, 503, 504):
                raise RuntimeError(f"HTTP {resp.status_code}")

            return resp

        except Exception as e:
            last_exc = e
            log(f"HTTP error attempt {attempt}/{HTTP_MAX_RETRIES} url={url}: {e}")
            time.sleep(min(delay, HTTP_BACKOFF_MAX) + random.uniform(0, 1.0))
            delay *= 2

    log(f"PanoramaFirm seems down. Sleeping {AI_RETRY_CHECK_SECONDS}s, then retrying...")
    time.sleep(AI_RETRY_CHECK_SECONDS)
    raise RuntimeError(f"HTTP failed after retries: {last_exc}")


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
# FALLBACK: NIP z HTML (#contact)
# =========================
def extract_nip_from_profile_html(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    contact = soup.select_one("#contact")
    if not contact:
        return None

    for row in contact.select(".contact-item"):
        cols = row.find_all("div", recursive=False)
        if len(cols) < 2:
            continue

        label = cols[0].get_text(strip=True)
        if "NIP" not in label:
            continue

        value = cols[1].get_text(" ", strip=True)
        nip = re.sub(r"\D", "", value)
        return nip if re.fullmatch(r"\d{10}", nip) else None

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
# DEDUPE (sourceUrl)
# =========================
def company_exists_by_source_url(conn, source_url: str) -> bool:
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM "Company" WHERE "sourceUrl" = %s LIMIT 1', (source_url,))
    ok = cur.fetchone() is not None
    cur.close()
    return ok


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
# OPENAI (strict-ish)
# =========================
def ensure_openai_available_forever():
    """
    Jeśli REQUIRE_AI=true, to bez klucza albo przy problemach z inicjalizacją
    nie kończymy procesu - śpimy i próbujemy ponownie co godzinę.
    """
    global client

    while True:
        if not OPENAI_API_KEY:
            if REQUIRE_AI:
                log(f"Brak OPENAI_API_KEY. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                time.sleep(AI_RETRY_CHECK_SECONDS)
                continue
            return False

        if client is None:
            try:
                # OpenAI >= 1.0: NIE używaj argumentu 'proxies' bezpośrednio
                # Jeśli potrzebujesz proxy, użyj http_client z httpx.Client
                # Przykład z proxy:
                # http_client = httpx.Client(
                #     proxies={
                #         "http://": "http://proxy.example.com:8080",
                #         "https://": "http://proxy.example.com:8080"
                #     }
                # )
                # client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)
                
                # Bez proxy (domyślne):
                client = OpenAI(api_key=OPENAI_API_KEY)
                return True
            except Exception as e:
                log(f"OpenAI init error: {e}. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                time.sleep(AI_RETRY_CHECK_SECONDS)
                continue

        return True


def rewrite_description_with_ai_strict(source_text: str, company_name: str, category_name: str, city: str | None) -> str:
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
- Bez nagłówków typu „O firmie” i bez emoji.
- Nie kończ CTA typu „zapraszamy do kontaktu”.

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
# SCRAPING
# =========================
def scrape_all_categories():
    categories = []

    popular = [
        "https://panoramafirm.pl/wykończenia_wnętrz",
        "https://panoramafirm.pl/malowanie_i_tapetowanie",
        "https://panoramafirm.pl/renowacje_i_remonty",
        "https://panoramafirm.pl/ślusarze",
        "https://panoramafirm.pl/ślusarstwo_i_dorabianie_kluczy",
        "https://panoramafirm.pl/serwis_sprzętu_agd",
        "https://panoramafirm.pl/serwis_i_instalacja_klimatyzacji",
        "https://panoramafirm.pl/sprzątanie_wnętrz_i_mycie_okien",
        "https://panoramafirm.pl/mechanika_samochodowa",
        "https://panoramafirm.pl/wulkanizacja_i_serwis_opon",
        "https://panoramafirm.pl/myjnie_samochodowe",
        "https://panoramafirm.pl/pomoc_drogowa",
        "https://panoramafirm.pl/odszkodowania",            
        "https://panoramafirm.pl/syndycy_i_likwidatorzy",
        "https://panoramafirm.pl/kredyty_i_finansowanie",
        "https://panoramafirm.pl/oddłużanie",
        "https://panoramafirm.pl/stomatolodzy_i_protetycy",
        "https://panoramafirm.pl/masaż",
        "https://panoramafirm.pl/elektroinstalatorstwo",
        "https://panoramafirm.pl/hydraulicy",
        "https://panoramafirm.pl/układanie_gresu_i_płytek_ceramicznych",
        "https://panoramafirm.pl/rehabilitacja",
        "https://panoramafirm.pl/rehabilitacja_medyczna",   
        "https://panoramafirm.pl/łańcuchy",
        "https://panoramafirm.pl/łożyska",
        "https://panoramafirm.pl/świece_i_znicze",
        "https://panoramafirm.pl/artykuły_rolnicze",
        "https://panoramafirm.pl/giełdy",
        "https://panoramafirm.pl/grzyby_i_runo_leśne",
        "https://panoramafirm.pl/hodowla_i_hurtownie_ryb",
        "https://panoramafirm.pl/hurtownie_rolnicze",
        "https://panoramafirm.pl/hurtownie_roślin,_nasion_i_cebulek",
        "https://panoramafirm.pl/jaja",
        "https://panoramafirm.pl/korek_naturalny",
        "https://panoramafirm.pl/leśnictwo",
        "https://panoramafirm.pl/nawozy",
        "https://panoramafirm.pl/ochrona_środowiska",
        "https://panoramafirm.pl/parki_narodowe,_krajobrazowe_i_rezerwaty",
        "https://panoramafirm.pl/pasze",
        "https://panoramafirm.pl/pieczarkarnie",
        "https://panoramafirm.pl/produkcja_artykułów_rolniczych",
        "https://panoramafirm.pl/wyroby_wiklinowe_i_bambusowe",
        "https://panoramafirm.pl/wywóz_śmieci_i_odpadów",
        "https://panoramafirm.pl/zamki_i_kłódki",
        "https://panoramafirm.pl/zamki_i_zabezpieczenia_antywłamaniowe",
        "https://panoramafirm.pl/zapalniczki_i_zapałki",
        "https://panoramafirm.pl/zasłony,_firanki_i_karnisze",
        "https://panoramafirm.pl/zawiesia_linowe,_łańcuchowe_i_pasowe",
        "https://panoramafirm.pl/ślusarstwo_i_dorabianie_kluczy",
        "https://panoramafirm.pl/ślusarze",
        "https://panoramafirm.pl/środki_ochrony_roślin",
        "https://panoramafirm.pl/świece_i_znicze",
        "https://panoramafirm.pl/artykuły_dziecięce",
        "https://panoramafirm.pl/artykuły_papiernicze",
        "https://panoramafirm.pl/artykuły_szkolne",
        "https://panoramafirm.pl/domy_dziecka",
        "https://panoramafirm.pl/hurtownie_artykułów_papierniczych",
        "https://panoramafirm.pl/hurtownie_i_producenci_artykułów_dziecięcych",
        "https://panoramafirm.pl/hurtownie_zabawek",
        "https://panoramafirm.pl/logopedzi",
        "https://panoramafirm.pl/odzież_dziecięca",
        "https://panoramafirm.pl/opieka_nad_dziećmi",
        "https://panoramafirm.pl/ośrodki_adopcyjno-wychowawcze",
        "https://panoramafirm.pl/ośrodki_szkolno-wychowawcze",
        "https://panoramafirm.pl/ośrodki_wychowawcze",
        "https://panoramafirm.pl/parki_rozrywki",
        "https://panoramafirm.pl/produkcja_artykułów_papierniczych",
        "https://panoramafirm.pl/produkcja_zabawek",
        "https://panoramafirm.pl/projektowanie_i_montaż_placów_zabaw",
        "https://panoramafirm.pl/przedszkola_prywatne",
        "https://panoramafirm.pl/przedszkola_publiczne",
        "https://panoramafirm.pl/sale_zabaw",
        "https://panoramafirm.pl/sklepy_z_zabawkami",
        "https://panoramafirm.pl/zabawki_edukacyjne",
        "https://panoramafirm.pl/świetlice_środowiskowe",
        "https://panoramafirm.pl/żłobki_prywatne",
        "https://panoramafirm.pl/żłobki_publiczne",
        "https://panoramafirm.pl/banki",
        "https://panoramafirm.pl/bankomaty",
        "https://panoramafirm.pl/biura_rachunkowe",
        "https://panoramafirm.pl/doradztwo_finansowe_i_kredytowe",
        "https://panoramafirm.pl/doradztwo_podatkowe",
        "https://panoramafirm.pl/fundusze_emerytalne",
        "https://panoramafirm.pl/fundusze_inwestycyjne",
        "https://panoramafirm.pl/giełdy",
        "https://panoramafirm.pl/kantory",
        "https://panoramafirm.pl/karty_kredytowe,_płatnicze_i_programy_lojalnościowe",
        "https://panoramafirm.pl/kredyty_i_finansowanie",
        "https://panoramafirm.pl/leasing",
        "https://panoramafirm.pl/maklerzy_giełdowi",
        "https://panoramafirm.pl/oddłużanie",
        "https://panoramafirm.pl/pośrednicy_ubezpieczeniowi",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_banków",
        "https://panoramafirm.pl/ubezpieczenia",
        "https://panoramafirm.pl/ubezpieczenia_społeczne",
        "https://panoramafirm.pl/windykacja_długów_i_należności",
        "https://panoramafirm.pl/administracja_obiektów_użyteczności_publicznej",
        "https://panoramafirm.pl/agencje_i_składy_celne",
        "https://panoramafirm.pl/ambasady",
        "https://panoramafirm.pl/archiwa_i_archiwizacja_danych",
        "https://panoramafirm.pl/biblioteki_i_czytelnie",
        "https://panoramafirm.pl/dobry_start_-_300_zł_dla_ucznia",
        "https://panoramafirm.pl/fundacje_i_instytucje_charytatywne",
        "https://panoramafirm.pl/inkubatory_przedsiębiorczości",
        "https://panoramafirm.pl/internaty_i_akademiki",
        "https://panoramafirm.pl/konserwacja_zabytków",
        "https://panoramafirm.pl/militaria",
        "https://panoramafirm.pl/narodowy_fundusz_zdrowia",
        "https://panoramafirm.pl/ochrona_środowiska",
        "https://panoramafirm.pl/ośrodki_adopcyjno-wychowawcze",
        "https://panoramafirm.pl/ośrodki_wychowawcze",
        "https://panoramafirm.pl/poczta_i_urzędy_pocztowe",
        "https://panoramafirm.pl/pogotowie_ratunkowe",
        "https://panoramafirm.pl/policja",
        "https://panoramafirm.pl/prokuratury",
        "https://panoramafirm.pl/rodzina_500_plus",
        "https://panoramafirm.pl/rzecznicy_patentowi",
        "https://panoramafirm.pl/sądy",
        "https://panoramafirm.pl/sołectwa",
        "https://panoramafirm.pl/specjalne_strefy_ekonomiczne",
        "https://panoramafirm.pl/spółdzielnie_i_administracje_mieszkaniowe",
        "https://panoramafirm.pl/stacje_sanitarno-epidemiologiczne",
        "https://panoramafirm.pl/starostwa_powiatowe",
        "https://panoramafirm.pl/stowarzyszenia,_kluby_i_związki",
        "https://panoramafirm.pl/straż_miejska",
        "https://panoramafirm.pl/straż_pożarna",
        "https://panoramafirm.pl/syndycy_i_likwidatorzy",
        "https://panoramafirm.pl/telefony_alarmowe",
        "https://panoramafirm.pl/telefony_zaufania",
        "https://panoramafirm.pl/unia_europejska",
        "https://panoramafirm.pl/urzędy_celne",
        "https://panoramafirm.pl/urzędy_centralne",
        "https://panoramafirm.pl/urzędy_marszałkowskie",
        "https://panoramafirm.pl/urzędy_miast_i_gmin",
        "https://panoramafirm.pl/urzędy_pracy",
        "https://panoramafirm.pl/urzędy_skarbowe",
        "https://panoramafirm.pl/urzędy_terenowe",
        "https://panoramafirm.pl/urzędy_wojewódzkie",
        "https://panoramafirm.pl/więzienia_i_zakłady_penitencjarne",
        "https://panoramafirm.pl/zarządy_cmentarzy_i_cmentarze",
        "https://panoramafirm.pl/agenci_okrętowi_i_morscy",
        "https://panoramafirm.pl/alarmy_samochodowe",
        "https://panoramafirm.pl/amortyzatory_samochodowe",
        "https://panoramafirm.pl/artykuły_pogrzebowe",
        "https://panoramafirm.pl/autozłom",
        "https://panoramafirm.pl/blacharstwo_i_lakiernictwo",
        "https://panoramafirm.pl/budowa_i_wyposażenie_garaży",
        "https://panoramafirm.pl/car_audio",
        "https://panoramafirm.pl/dealerzy_i_sprzedaż_samochodów",
        "https://panoramafirm.pl/elektromechanika",
        "https://panoramafirm.pl/elektronika_samochodowa",
        "https://panoramafirm.pl/folie_i_foliowanie",
        "https://panoramafirm.pl/giełdy",
        "https://panoramafirm.pl/haki_holownicze",
        "https://panoramafirm.pl/hurtownie_części_samochodowych",
        "https://panoramafirm.pl/instalacja_systemów_alarmowych",
        "https://panoramafirm.pl/kampery_i_przyczepy_kempingowe",
        "https://panoramafirm.pl/klimatyzacja_samochodowa",
        "https://panoramafirm.pl/koła_i_zestawy_jezdne",
        "https://panoramafirm.pl/komunikacja_i_przewozy_pasażerskie",
        "https://panoramafirm.pl/kosmetyki_samochodowe",
        "https://panoramafirm.pl/lakiery_samochodowe",
        "https://panoramafirm.pl/linie_lotnicze",
        "https://panoramafirm.pl/lotniska",
        "https://panoramafirm.pl/mechanika_samochodowa",
        "https://panoramafirm.pl/mobilne_myjnie_samochodowe",
        "https://panoramafirm.pl/motocykle,_skutery_i_quady",
        "https://panoramafirm.pl/myjnie_samochodowe",
        "https://panoramafirm.pl/naczepy_samochodowe",
        "https://panoramafirm.pl/nawigacja_i_lokalizacja_satelitarna",
        "https://panoramafirm.pl/oklejanie_samochodów",
        "https://panoramafirm.pl/operatorzy_logistyczni",
        "https://panoramafirm.pl/paliwa",
        "https://panoramafirm.pl/parkingi",
        "https://panoramafirm.pl/plandeki",
        "https://panoramafirm.pl/pojazdy_specjalistyczne",
        "https://panoramafirm.pl/pojazdy_zabytkowe_i_dorożki",
        "https://panoramafirm.pl/pomoc_drogowa",
        "https://panoramafirm.pl/produkcja_części_samochodowych",
        "https://panoramafirm.pl/produkcja_i_sprzedaż_opon",
        "https://panoramafirm.pl/przekładnie",
        "https://panoramafirm.pl/przeprowadzki",
        "https://panoramafirm.pl/przewozy_autokarowe",
        "https://panoramafirm.pl/przewozy_osób_niepełnosprawnych",
        "https://panoramafirm.pl/przyczepy_samochodowe",
        "https://panoramafirm.pl/punkty_ładowania_samochodów_elektrycznych",
        "https://panoramafirm.pl/regeneracja_części_samochodowych",
        "https://panoramafirm.pl/rejestracja_pojazdów",
        "https://panoramafirm.pl/samochodowe_agregaty_chłodnicze",
        "https://panoramafirm.pl/samochodowe_instalacje_gazowe",
        "https://panoramafirm.pl/samochody_używane",
        "https://panoramafirm.pl/serwis_samochodów_ciężarowych_i_dostawczych",
        "https://panoramafirm.pl/silniki_i_prądnice",
        "https://panoramafirm.pl/skrzynie_biegów",
        "https://panoramafirm.pl/spedycja",
        "https://panoramafirm.pl/spedycja_międzynarodowa",
        "https://panoramafirm.pl/sprzedaż_części_samochodowych",
        "https://panoramafirm.pl/sprzedaż_i_rezerwacja_biletów",
        "https://panoramafirm.pl/sprzedaż_samochodów_ciężarowych_i_dostawczych",
        "https://panoramafirm.pl/sprzęt_lotniczy",
        "https://panoramafirm.pl/sprzęt_torowy_i_kolejowy",
        "https://panoramafirm.pl/stacje_diagnostyczne_i_przeglądy_techniczne",
        "https://panoramafirm.pl/stacje_obsługi_i_warsztaty_samochodowe",
        "https://panoramafirm.pl/stacje_paliw",
        "https://panoramafirm.pl/szyberdachy",
        "https://panoramafirm.pl/szyby_samochodowe",
        "https://panoramafirm.pl/tablice_rejestracyjne",
        "https://panoramafirm.pl/tabor_kolejowy",
        "https://panoramafirm.pl/taksometry,_tachometry_i_tachografy",
        "https://panoramafirm.pl/tapicerka_i_pokrowce_samochodowe",
        "https://panoramafirm.pl/taxi",
        "https://panoramafirm.pl/tłumiki_i_układy_wydechowe",
        "https://panoramafirm.pl/transport_kolejowy",
        "https://panoramafirm.pl/transport_lotniczy",
        "https://panoramafirm.pl/transport_ładunków_niebezpiecznych",
        "https://panoramafirm.pl/transport_międzynarodowy",
        "https://panoramafirm.pl/transport_morski_i_śródlądowy",
        "https://panoramafirm.pl/transport_nadgabarytowy",
        "https://panoramafirm.pl/transport_samochodowy",
        "https://panoramafirm.pl/tuning_samochodów",
        "https://panoramafirm.pl/turbosprężarki",
        "https://panoramafirm.pl/urządzenia_parkingowe",
        "https://panoramafirm.pl/usługi_portowe_i_przeładunkowe",
        "https://panoramafirm.pl/używane_części_samochodowe",
        "https://panoramafirm.pl/wulkanizacja_i_serwis_opon",
        "https://panoramafirm.pl/wyciągi_i_koleje_linowe",
        "https://panoramafirm.pl/wynajem_samochodów_ciężarowych_i_dostawczych",
        "https://panoramafirm.pl/wynajem_samochodów_i_zarządzanie_flotą",
        "https://panoramafirm.pl/wynajem,_serwis_i_sprzedaż_autobusów",
        "https://panoramafirm.pl/wyposażenie_dodatkowe_samochodów",
        "https://panoramafirm.pl/wyposażenie_warsztatów_i_myjni_samochodowych",
        "https://panoramafirm.pl/zabezpieczenia_antykorozyjne_samochodów",
        "https://panoramafirm.pl/zabudowy_nadwozi_samochodowych",
        "https://panoramafirm.pl/znakowanie_i_monitorowanie_samochodów",
        "https://panoramafirm.pl/antykwariaty",
        "https://panoramafirm.pl/artykuły_biurowe",
        "https://panoramafirm.pl/artykuły_papiernicze",
        "https://panoramafirm.pl/artykuły_szkolne",
        "https://panoramafirm.pl/badania_i_usługi_archeologiczne",
        "https://panoramafirm.pl/biblioteki_i_czytelnie",
        "https://panoramafirm.pl/geolodzy_i_geofizycy",
        "https://panoramafirm.pl/hurtownie_artykułów_biurowych",
        "https://panoramafirm.pl/hurtownie_artykułów_papierniczych",
        "https://panoramafirm.pl/hurtownie_książek",
        "https://panoramafirm.pl/instrumenty_optyczne",
        "https://panoramafirm.pl/instytuty_i_ośrodki_badawcze",
        "https://panoramafirm.pl/internaty_i_akademiki",
        "https://panoramafirm.pl/korepetycje",
        "https://panoramafirm.pl/księgarnie",
        "https://panoramafirm.pl/kursy_i_nauka_jazdy",
        "https://panoramafirm.pl/kursy_i_szkolenia",
        "https://panoramafirm.pl/ośrodki_szkolno-wychowawcze",
        "https://panoramafirm.pl/producenci_artykułów_biurowych",
        "https://panoramafirm.pl/produkcja_artykułów_papierniczych",
        "https://panoramafirm.pl/prywatne_szkoły_podstawowe",
        "https://panoramafirm.pl/prywatne_szkoły_pomaturalne_i_policealne",
        "https://panoramafirm.pl/prywatne_szkoły_ponadgimnazjalne",
        "https://panoramafirm.pl/prywatne_uniwersytety_i_szkoły_wyższe",
        "https://panoramafirm.pl/przedszkola_prywatne",
        "https://panoramafirm.pl/przedszkola_publiczne",
        "https://panoramafirm.pl/publiczne_szkoły_podstawowe",
        "https://panoramafirm.pl/publiczne_szkoły_pomaturalne_i_policealne",
        "https://panoramafirm.pl/publiczne_uniwersytety_i_szkoły_wyższe",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_laboratoriów",
        "https://panoramafirm.pl/szkolenia_zawodowe",
        "https://panoramafirm.pl/szkoły_artystyczne",
        "https://panoramafirm.pl/szkoły_i_kursy_językowe",
        "https://panoramafirm.pl/szkoły_ponadpodstawowe",
        "https://panoramafirm.pl/szkoły_tańca",
        "https://panoramafirm.pl/taśmy_samoprzylepne",
        "https://panoramafirm.pl/żłobki_publiczne",
        "https://panoramafirm.pl/akcesoria_do_butów",
        "https://panoramafirm.pl/akcesoria_szewskie_i_kaletnicze",
        "https://panoramafirm.pl/artykuły_dziecięce",
        "https://panoramafirm.pl/bielizna",
        "https://panoramafirm.pl/czapki_i_kapelusze",
        "https://panoramafirm.pl/flagi_i_artykuły_propagandowe",
        "https://panoramafirm.pl/futra_i_kożuchy",
        "https://panoramafirm.pl/galanteria",
        "https://panoramafirm.pl/hafciarstwo",
        "https://panoramafirm.pl/hurtownie_bielizny",
        "https://panoramafirm.pl/hurtownie_obuwia",
        "https://panoramafirm.pl/hurtownie_odzieży",
        "https://panoramafirm.pl/hurtownie_tkanin_i_dzianin",
        "https://panoramafirm.pl/kaletnictwo_i_rymarstwo",
        "https://panoramafirm.pl/koszule_i_krawaty",
        "https://panoramafirm.pl/krawiectwo",
        "https://panoramafirm.pl/maszyny_dziewiarskie",
        "https://panoramafirm.pl/maszyny_hafciarskie",
        "https://panoramafirm.pl/obrusy",
        "https://panoramafirm.pl/odzież_damska",
        "https://panoramafirm.pl/odzież_dziecięca",
        "https://panoramafirm.pl/odzież_męska",
        "https://panoramafirm.pl/odzież_robocza",
        "https://panoramafirm.pl/odzież_skórzana",
        "https://panoramafirm.pl/odzież_sportowa",
        "https://panoramafirm.pl/odzież_używana",
        "https://panoramafirm.pl/parasole",
        "https://panoramafirm.pl/pasmanteria_i_dodatki_krawieckie",
        "https://panoramafirm.pl/pralnie_i_farbiarnie",
        "https://panoramafirm.pl/produkcja_bielizny",
        "https://panoramafirm.pl/produkcja_obuwia",
        "https://panoramafirm.pl/produkcja_odzieży",
        "https://panoramafirm.pl/produkcja_tkanin_i_dzianin",
        "https://panoramafirm.pl/puch_i_pierze",
        "https://panoramafirm.pl/rajstopy,_pończochy_i_skarpety",
        "https://panoramafirm.pl/ręczniki,_koce_i_pościel",
        "https://panoramafirm.pl/sklepy_obuwnicze",
        "https://panoramafirm.pl/sklepy_odzieżowe",
        "https://panoramafirm.pl/skóry_naturalne_i_sztuczne",
        "https://panoramafirm.pl/styliści,_wizażyści_i_projektanci_mody",
        "https://panoramafirm.pl/suknie_ślubne_i_komunijne",
        "https://panoramafirm.pl/szewc",
        "https://panoramafirm.pl/tkaniny_i_dzianiny",
        "https://panoramafirm.pl/urządzenia_do_produkcji_obuwia",
        "https://panoramafirm.pl/wełna_i_przędza",
        "https://panoramafirm.pl/wyposażenie_pralni_i_farbiarni",
        "https://panoramafirm.pl/wypożyczalnie_strojów",
        "https://panoramafirm.pl/pomysł_na_biznes",
        "https://panoramafirm.pl/aerozole",
        "https://panoramafirm.pl/agregaty_prądotwórcze",
        "https://panoramafirm.pl/agregaty,_komory_i_meble_chłodnicze",
        "https://panoramafirm.pl/akumulatory_i_baterie",
        "https://panoramafirm.pl/armatura_hydrauliczna",
        "https://panoramafirm.pl/armatura_przemysłowa",
        "https://panoramafirm.pl/artykuły_elektrotechniczne",
        "https://panoramafirm.pl/artykuły_metalowe",
        "https://panoramafirm.pl/automatyka",
        "https://panoramafirm.pl/autozłom",
        "https://panoramafirm.pl/badania_nieniszczące",
        "https://panoramafirm.pl/biopaliwa",
        "https://panoramafirm.pl/broń_i_amunicja",
        "https://panoramafirm.pl/brykiety_i_węgiel_drzewny",
        "https://panoramafirm.pl/budowa_i_sprzęt_drogowy",
        "https://panoramafirm.pl/budowa_i_wyposażenie_stacji_paliw",
        "https://panoramafirm.pl/budowa,_wyposażenie_i_remont_statków",
        "https://panoramafirm.pl/budownictwo_kolejowe",
        "https://panoramafirm.pl/budownictwo_przemysłowe",
        "https://panoramafirm.pl/chemia_gospodarcza",
        "https://panoramafirm.pl/czyszczące_urządzenia_przemysłowe",
        "https://panoramafirm.pl/czyściwa_przemysłowe",
        "https://panoramafirm.pl/drabiny",
        "https://panoramafirm.pl/drewno",
        "https://panoramafirm.pl/drewno_budowlane",
        "https://panoramafirm.pl/drewno_opałowe",
        "https://panoramafirm.pl/drut_i_liny_stalowe",
        "https://panoramafirm.pl/dystrybucja_energii_elektrycznej",
        "https://panoramafirm.pl/dźwigi_i_żurawie",
        "https://panoramafirm.pl/elektrociepłownie",
        "https://panoramafirm.pl/elektronarzędzia",
        "https://panoramafirm.pl/energia_odnawialna",
        "https://panoramafirm.pl/farby_i_lakiery",
        "https://panoramafirm.pl/filtry",
        "https://panoramafirm.pl/formy_wtryskowe",
        "https://panoramafirm.pl/galwanizacja",
        "https://panoramafirm.pl/gaz_ziemny",
        "https://panoramafirm.pl/gazy_techniczne",
        "https://panoramafirm.pl/górnicze_materiały_wybuchowe",
        "https://panoramafirm.pl/grzejnictwo_elektryczne",
        "https://panoramafirm.pl/hurtownie_artykułów_elektrotechnicznych",
        "https://panoramafirm.pl/hurtownie_artykułów_metalowych",
        "https://panoramafirm.pl/hurtownie_chemii_gospodarczej",
        "https://panoramafirm.pl/hurtownie_części_elektronicznych",
        "https://panoramafirm.pl/hurtownie_farb,_lakierów_i_emalii",
        "https://panoramafirm.pl/hurtownie_środków_chemicznych",
        "https://panoramafirm.pl/hurtownie_urządzeń_elektrycznych",
        "https://panoramafirm.pl/hydraulika_siłowa",
        "https://panoramafirm.pl/hydrotechnika",
        "https://panoramafirm.pl/instalacja_i_serwis_ogrzewania",
        "https://panoramafirm.pl/instalacje_i_urządzenia_energetyczne",
        "https://panoramafirm.pl/instalacje_przemysłowe",
        "https://panoramafirm.pl/inwestycje_budowlane",
        "https://panoramafirm.pl/kleje_i_żywice",
        "https://panoramafirm.pl/kompresory",
        "https://panoramafirm.pl/konstrukcje_aluminiowe",
        "https://panoramafirm.pl/konstrukcje_stalowe",
        "https://panoramafirm.pl/kontenery",
        "https://panoramafirm.pl/kraty_pomostowe",
        "https://panoramafirm.pl/laminaty",
        "https://panoramafirm.pl/lasery",
        "https://panoramafirm.pl/liczniki_energii_elektrycznej",
        "https://panoramafirm.pl/magnesy_i_elektromagnesy",
        "https://panoramafirm.pl/malowanie_i_lakierowanie_przemysłowe",
        "https://panoramafirm.pl/maszty_i_słupy",
        "https://panoramafirm.pl/maszyny_do_obróbki_drewna",
        "https://panoramafirm.pl/maszyny_do_obróbki_metali",
        "https://panoramafirm.pl/maszyny_dziewiarskie",
        "https://panoramafirm.pl/maszyny_i_sprzęt_górniczy",
        "https://panoramafirm.pl/maszyny_pakujące",
        "https://panoramafirm.pl/materiały_do_spawania_i_zgrzewania",
        "https://panoramafirm.pl/materiały_drewnopochodne",
        "https://panoramafirm.pl/materiały_elektryczne",
        "https://panoramafirm.pl/materiały_ognioodporne",
        "https://panoramafirm.pl/materiały_ścierne_i_polerskie",
        "https://panoramafirm.pl/metale_nieżelazne_i_kolorowe",
        "https://panoramafirm.pl/metale_żelazne",
        "https://panoramafirm.pl/metalizowanie_i_powlekanie_tworzyw",
        "https://panoramafirm.pl/napełnianie_butli_gazowych",
        "https://panoramafirm.pl/narzędzia",
        "https://panoramafirm.pl/narzędzia_pneumatyczne",
        "https://panoramafirm.pl/obróbka_metali",
        "https://panoramafirm.pl/obróbka_tworzyw_sztucznych",
        "https://panoramafirm.pl/odlewnie",
        "https://panoramafirm.pl/ogrzewanie_elektryczne",
        "https://panoramafirm.pl/okucia",
        "https://panoramafirm.pl/olej_opałowy",
        "https://panoramafirm.pl/oleje_techniczne_i_smary",
        "https://panoramafirm.pl/opakowania",
        "https://panoramafirm.pl/opakowania_foliowe",
        "https://panoramafirm.pl/opakowania_jednorazowe",
        "https://panoramafirm.pl/opakowania_z_tworzyw_sztucznych",
        "https://panoramafirm.pl/palety",
        "https://panoramafirm.pl/paliwa_i_opał_ekologiczny",
        "https://panoramafirm.pl/pasy_napędowe_i_transportujące",
        "https://panoramafirm.pl/pędzle_i_szczotki",
        "https://panoramafirm.pl/piece",
        "https://panoramafirm.pl/pirotechnika",
        "https://panoramafirm.pl/pneumatyka_siłowa",
        "https://panoramafirm.pl/podnośniki",
        "https://panoramafirm.pl/podzespoły_elektroniczne",
        "https://panoramafirm.pl/pompy",
        "https://panoramafirm.pl/posadzki_przemysłowe",
        "https://panoramafirm.pl/prace_podwodne",
        "https://panoramafirm.pl/producenci_farb_i_lakierów",
        "https://panoramafirm.pl/produkcja_artykułów_elektrotechnicznych",
        "https://panoramafirm.pl/produkcja_artykułów_higienicznych",
        "https://panoramafirm.pl/produkcja_artykułów_metalowych",
        "https://panoramafirm.pl/produkcja_chemii_gospodarczej",
        "https://panoramafirm.pl/produkcja_części_elektronicznych",
        "https://panoramafirm.pl/produkcja_kosmetyków",
        "https://panoramafirm.pl/produkcja_sprężyn",
        "https://panoramafirm.pl/produkcja_środków_chemicznych",
        "https://panoramafirm.pl/produkcja_urządzeń_elektronicznych",
        "https://panoramafirm.pl/produkcja_urządzeń_elektrycznych",
        "https://panoramafirm.pl/produkcja_zasłon,_firanek_i_karniszy",
        "https://panoramafirm.pl/przemysłowe_urządzenia_elektryczne",
        "https://panoramafirm.pl/przenośniki",
        "https://panoramafirm.pl/przewody,_kable_i_światłowody",
        "https://panoramafirm.pl/recykling",
        "https://panoramafirm.pl/rury",
        "https://panoramafirm.pl/sejfy_i_kasy_pancerne",
        "https://panoramafirm.pl/serwis_urządzeń_chłodniczych",
        "https://panoramafirm.pl/serwis_urządzeń_elektrycznych",
        "https://panoramafirm.pl/silikon",
        "https://panoramafirm.pl/silniki_i_prądnice",
        "https://panoramafirm.pl/sklepy_z_częściami_elektronicznymi",
        "https://panoramafirm.pl/sól_przemysłowa",
        "https://panoramafirm.pl/sprzęt_do_produkcji_opakowań",
        "https://panoramafirm.pl/sprzęt_do_utylizacji_odpadów",
        "https://panoramafirm.pl/sprzęt_i_materiały_hydrauliczne",
        "https://panoramafirm.pl/sprzęt_i_zabezpieczenia_przeciwpożarowe",
        "https://panoramafirm.pl/sprzęt_lotniczy",
        "https://panoramafirm.pl/sprzęt_radiokomunikacyjny",
        "https://panoramafirm.pl/sprzęt_torowy_i_kolejowy",
        "https://panoramafirm.pl/stacje_paliw",
        "https://panoramafirm.pl/stal_i_wyroby_stalowe",
        "https://panoramafirm.pl/studnie",
        "https://panoramafirm.pl/surowce_mineralne",
        "https://panoramafirm.pl/suwnice",
        "https://panoramafirm.pl/systemy_zamocowań",
        "https://panoramafirm.pl/szkło_budowlane",
        "https://panoramafirm.pl/szkło_przemysłowe",
        "https://panoramafirm.pl/sznury,_liny_i_nici",
        "https://panoramafirm.pl/tartaki",
        "https://panoramafirm.pl/technika_liniowa",
        "https://panoramafirm.pl/techniki_bezwykopowe",
        "https://panoramafirm.pl/toalety_przenośne",
        "https://panoramafirm.pl/tworzywa_sztuczne",
        "https://panoramafirm.pl/urządzenia_do_produkcji_obuwia",
        "https://panoramafirm.pl/urządzenia_elektroniczne",
        "https://panoramafirm.pl/urządzenia_elektryczne",
        "https://panoramafirm.pl/urządzenia_grzewcze",
        "https://panoramafirm.pl/urządzenia_i_maszyny_przemysłowe",
        "https://panoramafirm.pl/urządzenia_lakiernicze",
        "https://panoramafirm.pl/urządzenia_pneumatyczne",
        "https://panoramafirm.pl/urządzenia_pomiarowe",
        "https://panoramafirm.pl/urządzenia_spawalnicze_i_zgrzewające",
        "https://panoramafirm.pl/usługi_i_projekty_górnicze",
        "https://panoramafirm.pl/usługi_kamieniarskie",
        "https://panoramafirm.pl/usługi_spawania_i_zgrzewania",
        "https://panoramafirm.pl/uszczelki_i_uszczelnienia",
        "https://panoramafirm.pl/utylizacja_odpadów",
        "https://panoramafirm.pl/wagi",
        "https://panoramafirm.pl/węże_przemysłowe",
        "https://panoramafirm.pl/wodociągi_i_kanalizacja",
        "https://panoramafirm.pl/wózki_widłowe",
        "https://panoramafirm.pl/wyciągi_i_koleje_linowe",
        "https://panoramafirm.pl/wydobycie_i_sprzedaż_węgla",
        "https://panoramafirm.pl/wynajem_maszyn_i_narzędzi",
        "https://panoramafirm.pl/wyposażenie,_sprzęt_i_instalacje_chłodnicze",
        "https://panoramafirm.pl/wyroby_hutnicze",
        "https://panoramafirm.pl/wytwarzanie_energii_odnawialnej",
        "https://panoramafirm.pl/wzornictwo_przemysłowe",
        "https://panoramafirm.pl/zabezpieczenia_antykorozyjne",
        "https://panoramafirm.pl/zapalniczki_i_zapałki",
        "https://panoramafirm.pl/zawiesia_linowe,_łańcuchowe_i_pasowe",
        "https://panoramafirm.pl/zbiorniki_i_pojemniki",
        "https://panoramafirm.pl/złom_i_surowce_wtórne",
        "https://panoramafirm.pl/produkcja_roślin_i_nasion",
        "https://panoramafirm.pl/rośliny,_nasiona_i_cebulki",
        "https://panoramafirm.pl/serwis_sprzętu_rolniczego",
        "https://panoramafirm.pl/usługi_rolnicze",
        "https://panoramafirm.pl/wynajem_magazynów",
        "https://panoramafirm.pl/wynajem_powierzchni_chłodniczych",
        "https://panoramafirm.pl/wyroby_wiklinowe_i_bambusowe",
        "https://panoramafirm.pl/zboża",
        "https://panoramafirm.pl/zwierzęta_hodowlane",
        "https://panoramafirm.pl/środki_ochrony_roślin",
        "https://panoramafirm.pl/agencje_artystyczne",
        "https://panoramafirm.pl/akcesoria_dla_artystów_i_plastyków",
        "https://panoramafirm.pl/antyki_i_dzieła_sztuki",
        "https://panoramafirm.pl/antykwariaty",
        "https://panoramafirm.pl/artykuły_zoologiczne",
        "https://panoramafirm.pl/astrologia",
        "https://panoramafirm.pl/automaty_do_gier",
        "https://panoramafirm.pl/balony",
        "https://panoramafirm.pl/bary",
        "https://panoramafirm.pl/baseny_i_parki_wodne",
        "https://panoramafirm.pl/broń_i_amunicja",
        "https://panoramafirm.pl/centra_handlowe",
        "https://panoramafirm.pl/cyrki_i_wesołe_miasteczka",
        "https://panoramafirm.pl/domy_kultury_i_kluby_osiedlowe",
        "https://panoramafirm.pl/dyskoteki",
        "https://panoramafirm.pl/escape_rooms",
        "https://panoramafirm.pl/filatelistyka",
        "https://panoramafirm.pl/filatelistyka_i_numizmatyka",
        "https://panoramafirm.pl/galerie_sztuki",
        "https://panoramafirm.pl/genealogia_i_heraldyka",
        "https://panoramafirm.pl/gry_komputerowe",
        "https://panoramafirm.pl/hale_widowiskowo-sportowe",
        "https://panoramafirm.pl/hurtownie_książek",
        "https://panoramafirm.pl/hurtownie_sprzętu_sportowego_i_turystycznego",
        "https://panoramafirm.pl/hurtownie_zabawek",
        "https://panoramafirm.pl/instrumenty_i_sklepy_muzyczne",
        "https://panoramafirm.pl/jachty",
        "https://panoramafirm.pl/jeździectwo",
        "https://panoramafirm.pl/kasyna_i_bukmacherzy",
        "https://panoramafirm.pl/kawiarnie",
        "https://panoramafirm.pl/kina",
        "https://panoramafirm.pl/kluby_muzyczne",
        "https://panoramafirm.pl/kluby_nocne",
        "https://panoramafirm.pl/księgarnie",
        "https://panoramafirm.pl/lecznice_weterynaryjne",
        "https://panoramafirm.pl/metaloplastyka",
        "https://panoramafirm.pl/militaria",
        "https://panoramafirm.pl/modelarstwo",
        "https://panoramafirm.pl/muzea",
        "https://panoramafirm.pl/myślistwo",
        "https://panoramafirm.pl/nauka_muzyki",
        "https://panoramafirm.pl/nośniki_danych_i_płyty_cd_i_dvd",
        "https://panoramafirm.pl/numizmatyka",
        "https://panoramafirm.pl/odzież_sportowa",
        "https://panoramafirm.pl/ogrody_zoologiczne_i_botaniczne",
        "https://panoramafirm.pl/ośrodki_i_kluby_sportowo-rekreacyjne",
        "https://panoramafirm.pl/parki_rozrywki",
        "https://panoramafirm.pl/pirotechnika",
        "https://panoramafirm.pl/pizzerie",
        "https://panoramafirm.pl/pojazdy_zabytkowe_i_dorożki",
        "https://panoramafirm.pl/producenci_sprzętu_sportowego_i_turystycznego",
        "https://panoramafirm.pl/produkcja_zabawek",
        "https://panoramafirm.pl/projektowanie_i_montaż_placów_zabaw",
        "https://panoramafirm.pl/puby",
        "https://panoramafirm.pl/ramy_i_oprawy_obrazów",
        "https://panoramafirm.pl/restauracje",
        "https://panoramafirm.pl/rękodzieło_artystyczne",
        "https://panoramafirm.pl/rowery",
        "https://panoramafirm.pl/sale_weselne_i_organizacja_wesel",
        "https://panoramafirm.pl/sale_zabaw",
        "https://panoramafirm.pl/salony_bilardowe",
        "https://panoramafirm.pl/schroniska_dla_zwierząt",
        "https://panoramafirm.pl/siłownie_i_fitness",
        "https://panoramafirm.pl/sklepy_z_zabawkami",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_kręgielni",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_weterynaryjne",
        "https://panoramafirm.pl/sprzęt_sportowy_i_turystyczny",
        "https://panoramafirm.pl/stadiony_sportowe",
        "https://panoramafirm.pl/systemy_dźwiękowe_i_audio",
        "https://panoramafirm.pl/szkoły_tańca",
        "https://panoramafirm.pl/teatry_i_filharmonie",
        "https://panoramafirm.pl/wędkarstwo",
        "https://panoramafirm.pl/wynajem_i_serwis_sprzętu_sportowego_i_turystycznego",
        "https://panoramafirm.pl/wyposażenie_obiektów_sportowych",
        "https://panoramafirm.pl/wypożyczalnie_filmów_wideo_i_dvd",
        "https://panoramafirm.pl/zespoły_muzyczne",
        "https://panoramafirm.pl/zwierzęta_domowe",
        "https://panoramafirm.pl/świetlice_środowiskowe",
        "https://panoramafirm.pl/żegluga",
        "https://panoramafirm.pl/anteny",
        "https://panoramafirm.pl/audyty_oprogramowania_i_sprzętu_komputerowego",
        "https://panoramafirm.pl/informatyka",
        "https://panoramafirm.pl/internet",
        "https://panoramafirm.pl/odzyskiwanie_i_ochrona_danych_komputerowych",
        "https://panoramafirm.pl/operatorzy_telekomunikacyjni",
        "https://panoramafirm.pl/oprogramowanie_komputerowe",
        "https://panoramafirm.pl/serwis_komputerów",
        "https://panoramafirm.pl/serwisy_informacyjne",
        "https://panoramafirm.pl/sieci_komputerowe_i_integracja_systemów",
        "https://panoramafirm.pl/sprzęt_i_centrale_telefoniczne",
        "https://panoramafirm.pl/sprzęt_radiokomunikacyjny",
        "https://panoramafirm.pl/stacje_radiowe_i_telewizyjne",
        "https://panoramafirm.pl/systemy_i_technologie_multimedialne",
        "https://panoramafirm.pl/systemy_i_usługi_telekomunikacyjne",
        "https://panoramafirm.pl/agroturystyka",
        "https://panoramafirm.pl/biura_podróży_i_agencje_turystyczne",
        "https://panoramafirm.pl/hotele",
        "https://panoramafirm.pl/informacja_turystyczna",
        "https://panoramafirm.pl/kempingi",
        "https://panoramafirm.pl/komunikacja_i_przewozy_pasażerskie",
        "https://panoramafirm.pl/linie_lotnicze",
        "https://panoramafirm.pl/lotniska",
        "https://panoramafirm.pl/namioty_i_hale_namiotowe",
        "https://panoramafirm.pl/noclegi_i_kwatery_prywatne",
        "https://panoramafirm.pl/noclegownie",
        "https://panoramafirm.pl/pensjonaty,_hostele_i_ośrodki_wypoczynkowe",
        "https://panoramafirm.pl/sprzedaż_i_rezerwacja_biletów",
        "https://panoramafirm.pl/wyposażenie_hoteli",
        "https://panoramafirm.pl/adwokaci",
        "https://panoramafirm.pl/agenci_okrętowi_i_morscy",
        "https://panoramafirm.pl/agencje_fotograficzne",
        "https://panoramafirm.pl/agencje_i_doradztwo_reklamowe",
        "https://panoramafirm.pl/agencje_i_składy_celne",
        "https://panoramafirm.pl/agencje_marketingowe",
        "https://panoramafirm.pl/agencje_modelek",
        "https://panoramafirm.pl/agencje_ochrony",
        "https://panoramafirm.pl/agencje_pośrednictwa_pracy",
        "https://panoramafirm.pl/agencje_pracy_tymczasowej",
        "https://panoramafirm.pl/agencje_prasowe",
        "https://panoramafirm.pl/agencje_public_relations",
        "https://panoramafirm.pl/agencje_tłumaczy",
        "https://panoramafirm.pl/akcesoria_i_gadżety_reklamowe",
        "https://panoramafirm.pl/akcesoria_szewskie_i_kaletnicze",
        "https://panoramafirm.pl/archiwa_i_archiwizacja_danych",
        "https://panoramafirm.pl/artykuły_i_sprzęt_bhp",
        "https://panoramafirm.pl/artykuły_i_wyposażenie_salonów_fryzjerskich",
        "https://panoramafirm.pl/automaty_do_sprzedaży",
        "https://panoramafirm.pl/badania_i_monitoring_rynku",
        "https://panoramafirm.pl/badania_i_usługi_archeologiczne",
        "https://panoramafirm.pl/badania_i_uzdatnianie_wody",
        "https://panoramafirm.pl/banki",
        "https://panoramafirm.pl/bazy_danych",
        "https://panoramafirm.pl/biura_ogłoszeń",
        "https://panoramafirm.pl/biura_rachunkowe",
        "https://panoramafirm.pl/biura_reklamy",
        "https://panoramafirm.pl/bony_i_kupony",
        "https://panoramafirm.pl/budowa_i_wynajem_hal_przemysłowych",
        "https://panoramafirm.pl/catering",
        "https://panoramafirm.pl/czyszczenie_strumieniowo-ścierne",
        "https://panoramafirm.pl/czytniki_i_karty_identyfikacyjne",
        "https://panoramafirm.pl/dezynfekcja_dezynsekcja_i_deratyzacja",
        "https://panoramafirm.pl/doradztwo_finansowe_i_kredytowe",
        "https://panoramafirm.pl/doradztwo_personalne",
        "https://panoramafirm.pl/doradztwo_podatkowe",
        "https://panoramafirm.pl/doradztwo_prawne",
        "https://panoramafirm.pl/druk_cyfrowy",
        "https://panoramafirm.pl/druk_na_odzieży",
        "https://panoramafirm.pl/druk_offsetowy",
        "https://panoramafirm.pl/druk_plakatów_wielkoformatowych",
        "https://panoramafirm.pl/drukarnie_i_poligrafia",
        "https://panoramafirm.pl/druki_akcydensowe",
        "https://panoramafirm.pl/elektroinstalatorstwo",
        "https://panoramafirm.pl/etykiety_i_naklejki",
        "https://panoramafirm.pl/firmy_konsultingowe",
        "https://panoramafirm.pl/flagi_i_artykuły_propagandowe",
        "https://panoramafirm.pl/geodezja",
        "https://panoramafirm.pl/grafika_komputerowa",
        "https://panoramafirm.pl/grawerowanie",
        "https://panoramafirm.pl/hale_targów_i_wystaw",
        "https://panoramafirm.pl/hurt_i_produkcja_zegarów_i_zegarków",
        "https://panoramafirm.pl/hurtownie_sprzętu_fotograficznego",
        "https://panoramafirm.pl/import_i_eksport",
        "https://panoramafirm.pl/informatyka",
        "https://panoramafirm.pl/inkubatory_przedsiębiorczości",
        "https://panoramafirm.pl/instalacja_systemów_alarmowych",
        "https://panoramafirm.pl/instytuty_i_ośrodki_badawcze",
        "https://panoramafirm.pl/internet",
        "https://panoramafirm.pl/introligatornie",
        "https://panoramafirm.pl/kadry_i_płace",
        "https://panoramafirm.pl/kalendarze,_katalogi_i_foldery_reklamowe",
        "https://panoramafirm.pl/karty_kredytowe,_płatnicze_i_programy_lojalnościowe",
        "https://panoramafirm.pl/kasy_fiskalne_i_sklepowe",
        "https://panoramafirm.pl/kolportaż_gazet_i_czasopism",
        "https://panoramafirm.pl/konserwacja_zabytków",
        "https://panoramafirm.pl/kredyty_i_finansowanie",
        "https://panoramafirm.pl/ksero",
        "https://panoramafirm.pl/kurierzy",
        "https://panoramafirm.pl/kursy_i_szkolenia",
        "https://panoramafirm.pl/leasing",
        "https://panoramafirm.pl/lombardy",
        "https://panoramafirm.pl/mapy_i_plany",
        "https://panoramafirm.pl/maszyny_do_szycia",
        "https://panoramafirm.pl/maszyny_i_materiały_drukarskie",
        "https://panoramafirm.pl/naświetlanie_i_skanowanie_druku",
        "https://panoramafirm.pl/nawigacja_i_lokalizacja_satelitarna",
        "https://panoramafirm.pl/nieruchomości",
        "https://panoramafirm.pl/nietypowe_usługi_reklamowe",
        "https://panoramafirm.pl/niszczenie_dokumentów",
        "https://panoramafirm.pl/obiekty_konferencyjne",
        "https://panoramafirm.pl/obsługa_cudzoziemców",
        "https://panoramafirm.pl/oczyszczanie_ścieków",
        "https://panoramafirm.pl/odszkodowania",
        "https://panoramafirm.pl/odzież_robocza",
        "https://panoramafirm.pl/odzyskiwanie_i_ochrona_danych_komputerowych",
        "https://panoramafirm.pl/oklejanie_samochodów",
        "https://panoramafirm.pl/opakowania_papierowe_i_tekturowe",
        "https://panoramafirm.pl/operatorzy_logistyczni",
        "https://panoramafirm.pl/operatorzy_pocztowi",
        "https://panoramafirm.pl/operatorzy_telekomunikacyjni",
        "https://panoramafirm.pl/organizacja_i_sprzęt_dla_targów_i_wystaw",
        "https://panoramafirm.pl/organizacja_imprez_i_konferencji",
        "https://panoramafirm.pl/ostrzenie",
        "https://panoramafirm.pl/osuszanie_budynków",
        "https://panoramafirm.pl/papier",
        "https://panoramafirm.pl/plakatowanie",
        "https://panoramafirm.pl/pomiary,_konsultacje_i_badania_bhp",
        "https://panoramafirm.pl/pośrednictwo_handlu",
        "https://panoramafirm.pl/pośrednicy_ubezpieczeniowi",
        "https://panoramafirm.pl/prace_podwodne",
        "https://panoramafirm.pl/prace_wysokościowe",
        "https://panoramafirm.pl/pralnie_i_usługi_czyszczenia",
        "https://panoramafirm.pl/produkcja_i_dystrybucja_filmów",
        "https://panoramafirm.pl/przedstawicielstwa_firm_zagranicznych",
        "https://panoramafirm.pl/radcy_prawni",
        "https://panoramafirm.pl/recykling",
        "https://panoramafirm.pl/redakcje_i_wydawcy_gazet_i_czasopism",
        "https://panoramafirm.pl/reklama_zewnętrzna",
        "https://panoramafirm.pl/rewidenci_i_usługi_audytorskie",
        "https://panoramafirm.pl/rzecznicy_patentowi",
        "https://panoramafirm.pl/rzeczoznawcy",
        "https://panoramafirm.pl/serwis_i_instalacja_klimatyzacji",
        "https://panoramafirm.pl/serwis_kserokopiarek",
        "https://panoramafirm.pl/sitodruk",
        "https://panoramafirm.pl/skład_tekstu_do_druku",
        "https://panoramafirm.pl/specjalne_strefy_ekonomiczne",
        "https://panoramafirm.pl/spedycja",
        "https://panoramafirm.pl/spedycja_międzynarodowa",
        "https://panoramafirm.pl/sprzątanie_terenu",
        "https://panoramafirm.pl/sprzątanie_wnętrz_i_mycie_okien",
        "https://panoramafirm.pl/sprzedaż_wysyłkowa",
        "https://panoramafirm.pl/sprzęt_i_centrale_telefoniczne",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_kręgielni",
        "https://panoramafirm.pl/stacje_radiowe_i_telewizyjne",
        "https://panoramafirm.pl/studia_nagrań",
        "https://panoramafirm.pl/syndycy_i_likwidatorzy",
        "https://panoramafirm.pl/systemy_audiowizualne",
        "https://panoramafirm.pl/systemy_i_usługi_telekomunikacyjne",
        "https://panoramafirm.pl/systemy_kontroli_dostępu_i_czasu_pracy",
        "https://panoramafirm.pl/szyldy_i_banery",
        "https://panoramafirm.pl/telebimy_diodowe_led",
        "https://panoramafirm.pl/telefony_komórkowe",
        "https://panoramafirm.pl/telemarketing",
        "https://panoramafirm.pl/telewizja_przemysłowa",
        "https://panoramafirm.pl/telewizja_satelitarna",
        "https://panoramafirm.pl/tłumacze",
        "https://panoramafirm.pl/tłumacze_przysięgli",
        "https://panoramafirm.pl/torby,_walizki_i_teczki",
        "https://panoramafirm.pl/transport_kolejowy",
        "https://panoramafirm.pl/transport_lotniczy",
        "https://panoramafirm.pl/transport_ładunków_niebezpiecznych",
        "https://panoramafirm.pl/transport_międzynarodowy",
        "https://panoramafirm.pl/transport_morski_i_śródlądowy",
        "https://panoramafirm.pl/transport_samochodowy",
        "https://panoramafirm.pl/ubezpieczenia",
        "https://panoramafirm.pl/usługi_dystrybucyjne",
        "https://panoramafirm.pl/usługi_gazownicze",
        "https://panoramafirm.pl/usługi_pakowania",
        "https://panoramafirm.pl/usługi_portowe_i_przeładunkowe",
        "https://panoramafirm.pl/usługi_sekretarskie",
        "https://panoramafirm.pl/usługi_wysyłkowe",
        "https://panoramafirm.pl/usuwanie_i_neutralizacja_azbestu",
        "https://panoramafirm.pl/utylizacja_odpadów",
        "https://panoramafirm.pl/ważne_telefony",
        "https://panoramafirm.pl/windykacja_długów_i_należności",
        "https://panoramafirm.pl/wirtualne_biura",
        "https://panoramafirm.pl/wycena_nieruchomości",
        "https://panoramafirm.pl/wydawnictwa",
        "https://panoramafirm.pl/wynajem_i_sprzedaż_kserokopiarek",
        "https://panoramafirm.pl/wynajem_magazynów",
        "https://panoramafirm.pl/wynajem_powierzchni_chłodniczych",
        "https://panoramafirm.pl/wyposażenie_biur_projektowych",
        "https://panoramafirm.pl/wyposażenie_hoteli",
        "https://panoramafirm.pl/wyposażenie_i_narzędzia_jubilerskie",
        "https://panoramafirm.pl/wyposażenie_i_sprzęt_dla_kin_i_teatrów",
        "https://panoramafirm.pl/wyposażenie_i_sprzęt_introligatorski",
        "https://panoramafirm.pl/wyposażenie_i_zaopatrzenie_piekarni",
        "https://panoramafirm.pl/wyposażenie_klubów_bilardowych",
        "https://panoramafirm.pl/wyposażenie_kwiaciarni",
        "https://panoramafirm.pl/wyposażenie_magazynów",
        "https://panoramafirm.pl/wyposażenie_pralni_i_farbiarni",
        "https://panoramafirm.pl/wyposażenie_salonów_kosmetycznych",
        "https://panoramafirm.pl/wyposażenie_sklepów",
        "https://panoramafirm.pl/wyposażenie_stacji_radiowo-telewizyjnych",
        "https://panoramafirm.pl/wypożyczalnie_strojów",
        "https://panoramafirm.pl/wywiadownie_gospodarcze",
        "https://panoramafirm.pl/wywóz_śmieci_i_odpadów",
        "https://panoramafirm.pl/zaopatrzenie_biur",
        "https://panoramafirm.pl/zarządzanie_nieruchomościami",
        "https://panoramafirm.pl/znakowanie_i_monitorowanie_samochodów",
        "https://panoramafirm.pl/znakowanie,_kodowanie_i_hologramy",
        "https://panoramafirm.pl/adwokaci",
        "https://panoramafirm.pl/agencje_detektywistyczne",
        "https://panoramafirm.pl/agencje_fotograficzne",
        "https://panoramafirm.pl/agencje_ochrony",
        "https://panoramafirm.pl/agencje_pośrednictwa_pracy",
        "https://panoramafirm.pl/agencje_pracy_tymczasowej",
        "https://panoramafirm.pl/agencje_tłumaczy",
        "https://panoramafirm.pl/astrologia",
        "https://panoramafirm.pl/badania_i_uzdatnianie_wody",
        "https://panoramafirm.pl/bankomaty",
        "https://panoramafirm.pl/baseny_i_parki_wodne",
        "https://panoramafirm.pl/bazy_danych",
        "https://panoramafirm.pl/biura_matrymonialne",
        "https://panoramafirm.pl/bony_i_kupony",
        "https://panoramafirm.pl/budowa_i_wyposażenie_saun",
        "https://panoramafirm.pl/centra_handlowe",
        "https://panoramafirm.pl/czyszczenie_i_renowacja_dywanów_i_wykładzin",
        "https://panoramafirm.pl/czyszczenie_strumieniowo-ścierne",
        "https://panoramafirm.pl/deweloperzy",
        "https://panoramafirm.pl/dewocjonalia",
        "https://panoramafirm.pl/dezynfekcja_dezynsekcja_i_deratyzacja",
        "https://panoramafirm.pl/doradztwo_podatkowe",
        "https://panoramafirm.pl/doradztwo_prawne",
        "https://panoramafirm.pl/elektroakustyka",
        "https://panoramafirm.pl/elektroinstalatorstwo",
        "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie",
        "https://panoramafirm.pl/fundusze_emerytalne",
        "https://panoramafirm.pl/genealogia_i_heraldyka",
        "https://panoramafirm.pl/grafika_komputerowa",
        "https://panoramafirm.pl/grawerowanie",
        "https://panoramafirm.pl/handel_obwoźny",
        "https://panoramafirm.pl/handel_złotem_i_srebrem",
        "https://panoramafirm.pl/hotele_dla_zwierząt",
        "https://panoramafirm.pl/hurt_i_produkcja_zegarów_i_zegarków",
        "https://panoramafirm.pl/hurtownie_sprzętu_fotograficznego",
        "https://panoramafirm.pl/hydraulicy",
        "https://panoramafirm.pl/internet",
        "https://panoramafirm.pl/kaletnictwo_i_rymarstwo",
        "https://panoramafirm.pl/kantory",
        "https://panoramafirm.pl/kawiarenki_internetowe",
        "https://panoramafirm.pl/kominiarze",
        "https://panoramafirm.pl/komisy",
        "https://panoramafirm.pl/korepetycje",
        "https://panoramafirm.pl/krawiectwo",
        "https://panoramafirm.pl/ksero",
        "https://panoramafirm.pl/kurierzy",
        "https://panoramafirm.pl/kursy_i_nauka_jazdy",
        "https://panoramafirm.pl/kwiaciarnie",
        "https://panoramafirm.pl/leczenie_uzależnień",
        "https://panoramafirm.pl/lombardy",
        "https://panoramafirm.pl/lornetki_i_lunety",
        "https://panoramafirm.pl/magiel",
        "https://panoramafirm.pl/malowanie_i_tapetowanie",
        "https://panoramafirm.pl/mapy_i_plany",
        "https://panoramafirm.pl/maszyny_do_szycia",
        "https://panoramafirm.pl/nieruchomości",
        "https://panoramafirm.pl/notariusze",
        "https://panoramafirm.pl/obsługa_cudzoziemców",
        "https://panoramafirm.pl/oczyszczanie_ścieków",
        "https://panoramafirm.pl/odszkodowania",
        "https://panoramafirm.pl/odzyskiwanie_i_ochrona_danych_komputerowych",
        "https://panoramafirm.pl/operatorzy_pocztowi",
        "https://panoramafirm.pl/operatorzy_telekomunikacyjni",
        "https://panoramafirm.pl/organizacja_imprez_i_konferencji",
        "https://panoramafirm.pl/ostrzenie",
        "https://panoramafirm.pl/osuszanie_budynków",
        "https://panoramafirm.pl/pamiątki_i_upominki",
        "https://panoramafirm.pl/papierosy_elektroniczne",
        "https://panoramafirm.pl/place_i_hale_targowe",
        "https://panoramafirm.pl/pocztówki_i_widokówki",
        "https://panoramafirm.pl/pomoc_domowa",
        "https://panoramafirm.pl/pośrednicy_ubezpieczeniowi",
        "https://panoramafirm.pl/produkcja_kosmetyków",
        "https://panoramafirm.pl/przeprowadzki",
        "https://panoramafirm.pl/radcy_prawni",
        "https://panoramafirm.pl/rzeczoznawcy",
        "https://panoramafirm.pl/salony_spa_i_odnowa_biologiczna",
        "https://panoramafirm.pl/sejfy_i_kasy_pancerne",
        "https://panoramafirm.pl/serwis_i_instalacja_klimatyzacji",
        "https://panoramafirm.pl/siłownie_i_fitness",
        "https://panoramafirm.pl/sklepy_wielobranżowe",
        "https://panoramafirm.pl/solaria",
        "https://panoramafirm.pl/sprzątanie_wnętrz_i_mycie_okien",
        "https://panoramafirm.pl/sprzedaż_wysyłkowa",
        "https://panoramafirm.pl/sprzęt_fotograficzny",
        "https://panoramafirm.pl/styliści,_wizażyści_i_projektanci_mody",
        "https://panoramafirm.pl/supermarkety_i_hipermarkety",
        "https://panoramafirm.pl/systemy_i_usługi_telekomunikacyjne",
        "https://panoramafirm.pl/szewc",
        "https://panoramafirm.pl/tatuaże",
        "https://panoramafirm.pl/taxi",
        "https://panoramafirm.pl/telefony_alarmowe",
        "https://panoramafirm.pl/telefony_komórkowe",
        "https://panoramafirm.pl/telefony_zaufania",
        "https://panoramafirm.pl/telewizja_kablowa",
        "https://panoramafirm.pl/telewizja_przemysłowa",
        "https://panoramafirm.pl/telewizja_satelitarna",
        "https://panoramafirm.pl/tłumacze",
        "https://panoramafirm.pl/tłumacze_przysięgli",
        "https://panoramafirm.pl/torby,_walizki_i_teczki",
        "https://panoramafirm.pl/ubezpieczenia",
        "https://panoramafirm.pl/układanie_gresu_i_płytek_ceramicznych",
        "https://panoramafirm.pl/układanie_wykładzin_podłogowych",
        "https://panoramafirm.pl/usługi_fotograficzne",
        "https://panoramafirm.pl/usługi_gazownicze",
        "https://panoramafirm.pl/usługi_kamieniarskie",
        "https://panoramafirm.pl/usługi_pogrzebowe",
        "https://panoramafirm.pl/usługi_tapicerskie",
        "https://panoramafirm.pl/ważne_telefony",
        "https://panoramafirm.pl/wideofilmowanie",
        "https://panoramafirm.pl/wycena_nieruchomości",
        "https://panoramafirm.pl/wypożyczalnie_filmów_wideo_i_dvd",
        "https://panoramafirm.pl/wypożyczalnie_strojów",
        "https://panoramafirm.pl/wywóz_śmieci_i_odpadów",
        "https://panoramafirm.pl/zamki_i_zabezpieczenia_antywłamaniowe",
        "https://panoramafirm.pl/zegarmistrzowie",
        "https://panoramafirm.pl/ślusarstwo_i_dorabianie_kluczy",
        "https://panoramafirm.pl/ślusarze",
        "https://panoramafirm.pl/alergolodzy",
        "https://panoramafirm.pl/androlodzy",
        "https://panoramafirm.pl/anestezjolodzy",
        "https://panoramafirm.pl/aparaty_słuchowe",
        "https://panoramafirm.pl/apteki",
        "https://panoramafirm.pl/artykuły_i_sprzęt_pszczelarski",
        "https://panoramafirm.pl/artykuły_ortopedyczne",
        "https://panoramafirm.pl/baseny_i_parki_wodne",
        "https://panoramafirm.pl/biżuteria_sztuczna",
        "https://panoramafirm.pl/biżuteria_złota_i_srebrna",
        "https://panoramafirm.pl/budowa_i_wyposażenie_saun",
        "https://panoramafirm.pl/chirurdzy",
        "https://panoramafirm.pl/chirurgia_plastyczna",
        "https://panoramafirm.pl/dermatolodzy",
        "https://panoramafirm.pl/diabetolodzy",
        "https://panoramafirm.pl/dietetycy",
        "https://panoramafirm.pl/domy_i_ośrodki_pomocy_społecznej",
        "https://panoramafirm.pl/dozowniki_mydła",
        "https://panoramafirm.pl/endokrynolodzy",
        "https://panoramafirm.pl/fryzjerzy_dla_zwierząt",
        "https://panoramafirm.pl/fryzjerzy_i_salony_fryzjerskie",
        "https://panoramafirm.pl/gabinety_podologiczne",
        "https://panoramafirm.pl/gastrolodzy",
        "https://panoramafirm.pl/genetycy",
        "https://panoramafirm.pl/geriatrzy",
        "https://panoramafirm.pl/ginekolodzy_i_położnicy",
        "https://panoramafirm.pl/hematolodzy",
        "https://panoramafirm.pl/homeopaci",
        "https://panoramafirm.pl/hospicja",
        "https://panoramafirm.pl/hurtownie_artykułów_higienicznych",
        "https://panoramafirm.pl/hurtownie_biżuterii",
        "https://panoramafirm.pl/hurtownie_farmaceutyczne",
        "https://panoramafirm.pl/hurtownie_kosmetyczne",
        "https://panoramafirm.pl/instrumenty_optyczne",
        "https://panoramafirm.pl/interniści",
        "https://panoramafirm.pl/jubilerstwo",
        "https://panoramafirm.pl/kardiolodzy",
        "https://panoramafirm.pl/laboratoria_medyczne",
        "https://panoramafirm.pl/laryngolodzy",
        "https://panoramafirm.pl/leczenie_chorób_zakaźnych",
        "https://panoramafirm.pl/leczenie_uzależnień",
        "https://panoramafirm.pl/lekarskie_wizyty_domowe",
        "https://panoramafirm.pl/lekarze_analitycy",
        "https://panoramafirm.pl/lekarze_medycyny_estetycznej",
        "https://panoramafirm.pl/lekarze_medycyny_paliatywnej",
        "https://panoramafirm.pl/lekarze_medycyny_pracy",
        "https://panoramafirm.pl/lekarze_rodzinni",
        "https://panoramafirm.pl/lekarze_uzależnień_alkoholowych",
        "https://panoramafirm.pl/logopedzi",
        "https://panoramafirm.pl/masaż",
        "https://panoramafirm.pl/medycyna_naturalna",
        "https://panoramafirm.pl/mobilne_usługi_fryzjerskie",
        "https://panoramafirm.pl/mobilne_usługi_kosmetyczne",
        "https://panoramafirm.pl/narodowy_fundusz_zdrowia",
        "https://panoramafirm.pl/nefrolodzy",
        "https://panoramafirm.pl/neurochirurdzy",
        "https://panoramafirm.pl/neurolodzy",
        "https://panoramafirm.pl/odchudzanie",
        "https://panoramafirm.pl/odżywki_i_suplementy_diety",
        "https://panoramafirm.pl/okulary",
        "https://panoramafirm.pl/okuliści",
        "https://panoramafirm.pl/onkolodzy",
        "https://panoramafirm.pl/opieka_prywatna_nad_osobami_starszymi",
        "https://panoramafirm.pl/optycy",
        "https://panoramafirm.pl/ortodonci",
        "https://panoramafirm.pl/ortopedzi",
        "https://panoramafirm.pl/patomorfolodzy",
        "https://panoramafirm.pl/pediatrzy",
        "https://panoramafirm.pl/peruki_i_treski",
        "https://panoramafirm.pl/pielęgniarki",
        "https://panoramafirm.pl/pogotowie_ratunkowe",
        "https://panoramafirm.pl/praktyka_lekarska",
        "https://panoramafirm.pl/prezerwatywy",
        "https://panoramafirm.pl/producenci_farmaceutyków",
        "https://panoramafirm.pl/produkcja_artykułów_higienicznych",
        "https://panoramafirm.pl/produkcja_kosmetyków",
        "https://panoramafirm.pl/proktolodzy",
        "https://panoramafirm.pl/przedłużanie_i_zagęszczanie_włosów",
        "https://panoramafirm.pl/przewozy_osób_niepełnosprawnych",
        "https://panoramafirm.pl/przychodnie_prywatne",
        "https://panoramafirm.pl/psychiatrzy_psycholodzy_i_psychoterapeuci",
        "https://panoramafirm.pl/publiczne_przychodnie_i_ośrodki_zdrowia",
        "https://panoramafirm.pl/pulmonolodzy",
        "https://panoramafirm.pl/radiolodzy",
        "https://panoramafirm.pl/rehabilitacja",
        "https://panoramafirm.pl/rehabilitacja_medyczna",
        "https://panoramafirm.pl/reumatolodzy",
        "https://panoramafirm.pl/salony_i_gabinety_kosmetyczne",
        "https://panoramafirm.pl/salony_spa_i_odnowa_biologiczna",
        "https://panoramafirm.pl/sanatoria",
        "https://panoramafirm.pl/seksuolodzy",
        "https://panoramafirm.pl/siłownie_i_fitness",
        "https://panoramafirm.pl/sklepy_z_artykułami_kosmetycznymi",
        "https://panoramafirm.pl/solaria",
        "https://panoramafirm.pl/sprzęt_i_materiały_stomatologiczne",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_salonów_spa",
        "https://panoramafirm.pl/sprzęt_i_wyposażenie_solariów",
        "https://panoramafirm.pl/sprzęt_rehabilitacyjny",
        "https://panoramafirm.pl/stomatolodzy_i_protetycy",
        "https://panoramafirm.pl/styliści,_wizażyści_i_projektanci_mody",
        "https://panoramafirm.pl/szkoły_rodzenia",
        "https://panoramafirm.pl/szpitale_i_kliniki_prywatne",
        "https://panoramafirm.pl/szpitale_i_kliniki_publiczne",
        "https://panoramafirm.pl/tatuaże",
        "https://panoramafirm.pl/ubezpieczenia_społeczne",
        "https://panoramafirm.pl/urolodzy",
        "https://panoramafirm.pl/wyposażenie_i_sprzęt_medyczny",
        "https://panoramafirm.pl/zakłady_opiekuńczo-lecznicze",
        "https://panoramafirm.pl/żywność_ekologiczna",
        "https://panoramafirm.pl/aromaty_i_dodatki_do_żywności",
        "https://panoramafirm.pl/bary",
        "https://panoramafirm.pl/catering",
        "https://panoramafirm.pl/cukiernie_i_sklepy_cukiernicze",
        "https://panoramafirm.pl/cukrownie",
        "https://panoramafirm.pl/grzyby_i_runo_leśne",
        "https://panoramafirm.pl/herbata",
        "https://panoramafirm.pl/hodowla_i_hurtownie_ryb",
        "https://panoramafirm.pl/hurtownie_alkoholi",
        "https://panoramafirm.pl/hurtownie_cukiernicze",
        "https://panoramafirm.pl/hurtownie_mięsa,_wędlin_i_drobiu",
        "https://panoramafirm.pl/hurtownie_nabiału",
        "https://panoramafirm.pl/hurtownie_spożywcze",
        "https://panoramafirm.pl/hurtownie_warzyw_i_owoców",
        "https://panoramafirm.pl/jaja",
        "https://panoramafirm.pl/kawa",
        "https://panoramafirm.pl/kawiarnie",
        "https://panoramafirm.pl/mąka",
        "https://panoramafirm.pl/mięso_i_wędliny",
        "https://panoramafirm.pl/miód_i_produkty_pszczelarskie",
        "https://panoramafirm.pl/mrożonki",
        "https://panoramafirm.pl/napoje_orzeźwiające_i_wody",
        "https://panoramafirm.pl/oleje_i_tłuszcze_spożywcze",
        "https://panoramafirm.pl/papierosy_elektroniczne",
        "https://panoramafirm.pl/papierosy_i_tytoń",
        "https://panoramafirm.pl/piekarnie",
        "https://panoramafirm.pl/pizzerie",
        "https://panoramafirm.pl/producenci_alkoholi",
        "https://panoramafirm.pl/producenci_i_hurtownie_lodów",
        "https://panoramafirm.pl/producenci_i_hurtownie_piwa",
        "https://panoramafirm.pl/producenci_i_hurtownie_żywności_ekologicznej",
        "https://panoramafirm.pl/producenci_mięsa,_wędlin_i_drobiu",
        "https://panoramafirm.pl/producenci_żywności",
        "https://panoramafirm.pl/produkcja_nabiału",
        "https://panoramafirm.pl/produkcja_wyrobów_cukierniczych",
        "https://panoramafirm.pl/przetwórstwo_rybne",
        "https://panoramafirm.pl/przetwórstwo_warzyw_i_owoców",
        "https://panoramafirm.pl/puby",
        "https://panoramafirm.pl/rybołówstwo",
        "https://panoramafirm.pl/ryby_i_owoce_morza",
        "https://panoramafirm.pl/sklepy_monopolowe",
        "https://panoramafirm.pl/sklepy_owocowo-warzywne",
        "https://panoramafirm.pl/sklepy_spożywcze",
        "https://panoramafirm.pl/urządzenia_do_produkcji_żywności",
        "https://panoramafirm.pl/wyposażenie_i_zaopatrzenie_piekarni",
        "https://panoramafirm.pl/zaopatrzenie_i_wyposażenie_gastronomiczne",
        "https://panoramafirm.pl/zioła_i_przyprawy",
        "https://panoramafirm.pl/żywność_ekologiczna",
        "https://panoramafirm.pl/akcesoria_do_komputerów",
        "https://panoramafirm.pl/artykuły_biurowe",
        "https://panoramafirm.pl/artykuły_i_sprzęt_bhp",
        "https://panoramafirm.pl/artykuły_papiernicze",
        "https://panoramafirm.pl/artykuły_szkolne",
        "https://panoramafirm.pl/audyty_oprogramowania_i_sprzętu_komputerowego",
        "https://panoramafirm.pl/części_komputerowe",
        "https://panoramafirm.pl/drukarki_i_urządzenia_peryferyjne",
        "https://panoramafirm.pl/etykiety_i_naklejki",
        "https://panoramafirm.pl/folie_i_foliowanie",
        "https://panoramafirm.pl/hurtownie_artykułów_biurowych",
        "https://panoramafirm.pl/hurtownie_artykułów_papierniczych",
        "https://panoramafirm.pl/hurtownie_dywanów_i_wykładzin",
        "https://panoramafirm.pl/ksero",
        "https://panoramafirm.pl/meble_biurowe",
        "https://panoramafirm.pl/meble_metalowe",
        "https://panoramafirm.pl/oprogramowanie_komputerowe",
        "https://panoramafirm.pl/papier",
        "https://panoramafirm.pl/pieczątki_i_stemple",
        "https://panoramafirm.pl/pomiary,_konsultacje_i_badania_bhp",
        "https://panoramafirm.pl/producenci_artykułów_biurowych",
        "https://panoramafirm.pl/produkcja_artykułów_papierniczych",
        "https://panoramafirm.pl/serwis_komputerów",
        "https://panoramafirm.pl/serwis_kserokopiarek",
        "https://panoramafirm.pl/sieci_komputerowe_i_integracja_systemów",
        "https://panoramafirm.pl/sprzedaż_komputerów",
        "https://panoramafirm.pl/sprzęt_i_centrale_telefoniczne",
        "https://panoramafirm.pl/systemy_audiowizualne",
        "https://panoramafirm.pl/systemy_i_technologie_multimedialne",
        "https://panoramafirm.pl/taśmy_samoprzylepne",
        "https://panoramafirm.pl/wynajem_i_sprzedaż_kserokopiarek",
        "https://panoramafirm.pl/wyposażenie_biur",
        "https://panoramafirm.pl/zaopatrzenie_biur",
        "https://panoramafirm.pl/akcesoria_do_komputerów",
        "https://panoramafirm.pl/artykuły_biurowe",
        "https://panoramafirm.pl/artykuły_i_sprzęt_bhp",
        "https://panoramafirm.pl/artykuły_papiernicze",
        "https://panoramafirm.pl/artykuły_szkolne",
        "https://panoramafirm.pl/audyty_oprogramowania_i_sprzętu_komputerowego",
        "https://panoramafirm.pl/części_komputerowe",
        "https://panoramafirm.pl/drukarki_i_urządzenia_peryferyjne",
        "https://panoramafirm.pl/etykiety_i_naklejki",
        "https://panoramafirm.pl/folie_i_foliowanie",
        "https://panoramafirm.pl/hurtownie_artykułów_biurowych",
        "https://panoramafirm.pl/hurtownie_artykułów_papierniczych",
        "https://panoramafirm.pl/hurtownie_dywanów_i_wykładzin",
        "https://panoramafirm.pl/ksero",
        "https://panoramafirm.pl/meble_biurowe",
        "https://panoramafirm.pl/meble_metalowe",
        "https://panoramafirm.pl/oprogramowanie_komputerowe",
        "https://panoramafirm.pl/papier",
        "https://panoramafirm.pl/pieczątki_i_stemple",
        "https://panoramafirm.pl/pomiary,_konsultacje_i_badania_bhp",
        "https://panoramafirm.pl/producenci_artykułów_biurowych",
        "https://panoramafirm.pl/produkcja_artykułów_papierniczych",
        "https://panoramafirm.pl/serwis_komputerów",
        "https://panoramafirm.pl/serwis_kserokopiarek",
        "https://panoramafirm.pl/sieci_komputerowe_i_integracja_systemów",
        "https://panoramafirm.pl/sprzedaż_komputerów",
        "https://panoramafirm.pl/sprzęt_i_centrale_telefoniczne",
        "https://panoramafirm.pl/systemy_audiowizualne",
        "https://panoramafirm.pl/systemy_i_technologie_multimedialne",
        "https://panoramafirm.pl/taśmy_samoprzylepne",
        "https://panoramafirm.pl/wynajem_i_sprzedaż_kserokopiarek",
        "https://panoramafirm.pl/wyposażenie_biur",
        "https://panoramafirm.pl/zaopatrzenie_biur",
        "https://panoramafirm.pl/akcesoria_do_drzwi_i_okien",
        "https://panoramafirm.pl/akcesoria_meblowe",
        "https://panoramafirm.pl/anteny",
        "https://panoramafirm.pl/architektura_krajobrazu",
        "https://panoramafirm.pl/armatura_hydrauliczna",
        "https://panoramafirm.pl/artykuły_i_sprzęt_ogrodniczy",
        "https://panoramafirm.pl/biura_architektoniczne",
        "https://panoramafirm.pl/biura_projektowe",
        "https://panoramafirm.pl/bramy_i_ogrodzenia",
        "https://panoramafirm.pl/brykiety_i_węgiel_drzewny",
        "https://panoramafirm.pl/budowa_i_wykończenia_pod_klucz",
        "https://panoramafirm.pl/budowa_i_wyposażenie_garaży",
        "https://panoramafirm.pl/ceramika_ozdobna",
        "https://panoramafirm.pl/chemia_gospodarcza",
        "https://panoramafirm.pl/czyszczenie_i_renowacja_dywanów_i_wykładzin",
        "https://panoramafirm.pl/dachy_i_rynny",
        "https://panoramafirm.pl/dekoratorstwo_i_architektura_wnętrz",
        "https://panoramafirm.pl/deweloperzy",
        "https://panoramafirm.pl/dozowniki_mydła",
        "https://panoramafirm.pl/drewno_opałowe",
        "https://panoramafirm.pl/drzwi",
        "https://panoramafirm.pl/drzwi_antywłamaniowe",
        "https://panoramafirm.pl/dywany_i_wykładziny",
        "https://panoramafirm.pl/elektroinstalatorstwo",
        "https://panoramafirm.pl/filtry",
        "https://panoramafirm.pl/folie_i_foliowanie",
        "https://panoramafirm.pl/gres,_terakota_i_płytki_ceramiczne",
        "https://panoramafirm.pl/grzejnictwo_elektryczne",
        "https://panoramafirm.pl/hurtownie_artykułów_higienicznych",
        "https://panoramafirm.pl/hurtownie_dywanów_i_wykładzin",
        "https://panoramafirm.pl/hurtownie_gresu,_terakoty_i_płytek_ceramicznych",
        "https://panoramafirm.pl/hurtownie_parkietu_i_paneli_podłogowych",
        "https://panoramafirm.pl/hurtownie_rtv",
        "https://panoramafirm.pl/hurtownie_sprzętu_agd",
        "https://panoramafirm.pl/hurtownie_szkła_ozdobnego_i_kryształów",
        "https://panoramafirm.pl/hurtownie_urządzeń_elektrycznych",
        "https://panoramafirm.pl/hurtownie_urządzeń_sanitarnych",
        "https://panoramafirm.pl/hurtownie_zasłon,_firanek_i_karniszy",
        "https://panoramafirm.pl/hurtownie_żaluzji_i_rolet",
        "https://panoramafirm.pl/hydraulicy",
        "https://panoramafirm.pl/hydraulika_siłowa",
        "https://panoramafirm.pl/instalacja_i_serwis_ogrzewania",
        "https://panoramafirm.pl/instalacja_systemów_alarmowych",
        "https://panoramafirm.pl/kominiarze",
        "https://panoramafirm.pl/kominki",
        "https://panoramafirm.pl/kominy",
        "https://panoramafirm.pl/kryształy_i_szkło_ozdobne",
        "https://panoramafirm.pl/lampy_i_oświetlenie_wnętrz",
        "https://panoramafirm.pl/lustra",
        "https://panoramafirm.pl/magiel",
        "https://panoramafirm.pl/malowanie_i_tapetowanie",
        "https://panoramafirm.pl/maszyny_dziewiarskie",
        "https://panoramafirm.pl/materace",
        "https://panoramafirm.pl/materiały_do_wykańczania_wnętrz",
        "https://panoramafirm.pl/materiały_drewnopochodne",
        "https://panoramafirm.pl/materiały_elektryczne",
        "https://panoramafirm.pl/materiały_tapicerskie",
        "https://panoramafirm.pl/meble",
        "https://panoramafirm.pl/meble_biurowe",
        "https://panoramafirm.pl/meble_kuchenne",
        "https://panoramafirm.pl/meble_metalowe",
        "https://panoramafirm.pl/meble_na_zamówienie",
        "https://panoramafirm.pl/meble_ogrodowe",
        "https://panoramafirm.pl/meble_specjalistyczne",
        "https://panoramafirm.pl/montaż_i_produkcja_basenów_i_fontann",
        "https://panoramafirm.pl/montaż_i_sprzedaż_żaluzji_i_rolet",
        "https://panoramafirm.pl/napełnianie_butli_gazowych",
        "https://panoramafirm.pl/nośniki_danych_i_płyty_cd_i_dvd",
        "https://panoramafirm.pl/obrusy",
        "https://panoramafirm.pl/oczyszczanie_ścieków",
        "https://panoramafirm.pl/odkurzacze_centralne",
        "https://panoramafirm.pl/ogrodnictwo",
        "https://panoramafirm.pl/ogrzewanie_elektryczne",
        "https://panoramafirm.pl/okleiny",
        "https://panoramafirm.pl/okna",
        "https://panoramafirm.pl/okna_dachowe",
        "https://panoramafirm.pl/okna_drewniane",
        "https://panoramafirm.pl/oświetlenie",
        "https://panoramafirm.pl/ozdoby_świąteczne",
        "https://panoramafirm.pl/panele_i_podłogi",
        "https://panoramafirm.pl/parapety",
        "https://panoramafirm.pl/parkiet_i_panele_podłogowe",
        "https://panoramafirm.pl/pomoc_domowa",
        "https://panoramafirm.pl/porcelana_i_fajans",
        "https://panoramafirm.pl/poręcze_i_balustrady",
        "https://panoramafirm.pl/posadzki_przemysłowe",
        "https://panoramafirm.pl/producenci_domów_drewnianych",
        "https://panoramafirm.pl/produkcja_artykułów_higienicznych",
        "https://panoramafirm.pl/produkcja_i_hurtownie_narzędzi",
        "https://panoramafirm.pl/produkcja_i_montaż_domofonów",
        "https://panoramafirm.pl/produkcja_kryształów_i_szkła_ozdobnego",
        "https://panoramafirm.pl/produkcja_parkietu_i_paneli_podłogowych",
        "https://panoramafirm.pl/produkcja_roślin_i_nasion",
        "https://panoramafirm.pl/produkcja_sprzętu_agd",
        "https://panoramafirm.pl/produkcja_sprzętu_rtv",
        "https://panoramafirm.pl/produkcja_systemów_alarmowych",
        "https://panoramafirm.pl/produkcja_urządzeń_elektronicznych",
        "https://panoramafirm.pl/produkcja_urządzeń_elektrycznych",
        "https://panoramafirm.pl/produkcja_urządzeń_sanitarnych",
        "https://panoramafirm.pl/produkcja_zasłon,_firanek_i_karniszy",
        "https://panoramafirm.pl/produkcja_żaluzji_i_rolet",
        "https://panoramafirm.pl/ramy_i_oprawy_obrazów",
        "https://panoramafirm.pl/renowacja_mebli",
        "https://panoramafirm.pl/renowacje_i_remonty",
        "https://panoramafirm.pl/ręczniki,_koce_i_pościel",
        "https://panoramafirm.pl/rośliny_sztuczne",
        "https://panoramafirm.pl/rośliny,_nasiona_i_cebulki",
        "https://panoramafirm.pl/schody",
        "https://panoramafirm.pl/serwis_rtv",
        "https://panoramafirm.pl/serwis_sprzętu_agd",
        "https://panoramafirm.pl/serwis_urządzeń_elektrycznych",
        "https://panoramafirm.pl/sklepy_ze_sprzętem_agd",
        "https://panoramafirm.pl/sklepy_ze_sprzętem_rtv",
        "https://panoramafirm.pl/sprzątanie_wnętrz_i_mycie_okien",
        "https://panoramafirm.pl/sprzęt_do_malowania_i_tapetowania",
        "https://panoramafirm.pl/sprzęt_i_materiały_hydrauliczne",
        "https://panoramafirm.pl/sprzęt_i_zabezpieczenia_przeciwpożarowe",
        "https://panoramafirm.pl/stolarze",
        "https://panoramafirm.pl/studnie",
        "https://panoramafirm.pl/sufity_podwieszane",
        "https://panoramafirm.pl/systemy_audiowizualne",
        "https://panoramafirm.pl/systemy_dźwiękowe_i_audio",
        "https://panoramafirm.pl/systemy_zabudowy_wnętrz",
        "https://panoramafirm.pl/szklarze",
        "https://panoramafirm.pl/tapety",
        "https://panoramafirm.pl/telewizja_kablowa",
        "https://panoramafirm.pl/telewizja_satelitarna",
        "https://panoramafirm.pl/układanie_gresu_i_płytek_ceramicznych",
        "https://panoramafirm.pl/układanie_wykładzin_podłogowych",
        "https://panoramafirm.pl/urządzenia_elektroniczne",
        "https://panoramafirm.pl/urządzenia_elektryczne",
        "https://panoramafirm.pl/urządzenia_grzewcze",
        "https://panoramafirm.pl/urządzenia_sanitarne",
        "https://panoramafirm.pl/usługi_gazownicze",
        "https://panoramafirm.pl/usługi_kamieniarskie",
        "https://panoramafirm.pl/usługi_posadzkarskie",
        "https://panoramafirm.pl/usługi_tapicerskie",
        "https://panoramafirm.pl/uszczelki_i_uszczelnienia",
        "https://panoramafirm.pl/witraże",
        "https://panoramafirm.pl/wodociągi_i_kanalizacja",
        "https://panoramafirm.pl/wycieraczki_i_maty",
        "https://panoramafirm.pl/wykończenia_wnętrz",
        "https://panoramafirm.pl/wyposażenie_kuchni",
        "https://panoramafirm.pl/wyposażenie_łazienek",
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

    # dedupe bez zmiany kolejności
    seen = set()
    unique = []
    for cat in categories:
        if cat["url"] in seen:
            continue
        seen.add(cat["url"])
        unique.append(cat)

    return unique


def scrape_category_listing_until_end(session: requests.Session, listing_url: str):
    """
    Scrapuje listę firm z kategorii używając Playwright (obsługuje JavaScript).
    Zachowuje kompatybilność z resztą kodu - zwraca te same dane co wcześniej.
    """
    results = []
    seen_urls = set()

    with sync_playwright() as p:
        # Uruchom przeglądarkę (headless=True dla produkcji)
        browser = p.chromium.launch(headless=True)
        
        # Opcje kontekstu - user agent, viewport
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = context.new_page()
        
        page_num = 1
        while True:
            if MAX_PAGES_PER_CATEGORY > 0 and page_num > MAX_PAGES_PER_CATEGORY:
                break

            # Formatuj URL
            if page_num > 1:
                url = f"{listing_url.rstrip('/')}/firmy,{page_num}.html"
            else:
                url = listing_url.rstrip('/')
            log(f"  Listing page {page_num}: {url}")

            try:
                # Wejdź na stronę z Playwright
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Czekaj na załadowanie firm (dostosuj selektor!)
                try:
                    page.wait_for_selector(
                        'a[href*="/firma/"], a.company-link, .company-item a, article a, a[class*="company"]',
                        timeout=10000
                    )
                except PlaywrightTimeout:
                    log(f"  ⚠️ Timeout waiting for company links on page {page_num}")
                    # Zapisz screenshot do debugowania
                    try:
                        page.screenshot(path=f"debug_page_{page_num}_{int(time.time())}.png")
                    except:
                        pass
                    break
                
                # Przewiń stronę w dół, żeby załadować lazy-loaded content
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(random.uniform(1, 2))
                
                # Pobierz HTML po wykonaniu JavaScript
                html = page.content()
                
                # Sprawdź czy strona nie jest zbyt krótka
                if len(html) < 1000:
                    log(f"  Page seems too short ({len(html)} bytes), might be empty or redirect")
                    break

                soup = BeautifulSoup(html, "html.parser")
        
                # Sprawdź czy strona nie jest przekierowaniem lub błędem
                page_title = soup.find("title")
                if page_title:
                    title_text = page_title.get_text().lower()
                    if any(keyword in title_text for keyword in ["404", "not found", "błąd", "error", "przekierowanie"]):
                        log(f"  Page appears to be error/redirect page: {title_text[:50]}")
                        break
                
                # DEBUG: Sprawdź podstawowe informacje o stronie
                all_links_count = len(soup.select("a[href]"))
                log(f"  DEBUG: Page loaded, total links: {all_links_count}, HTML size: {len(html)} bytes")
                
                # Próbuj różne selektory - PanoramaFirm często zmienia strukturę HTML
                links = []
        
                # 1. Nowy selektor (2025+) - class zawierający 'company'
                links = soup.select("a[class*='company'], a[class*='Company']")
                if links:
                    log(f"  DEBUG: Found {len(links)} links via selector 1 (class*='company')")
                
                # 2. Selektor z data-attribute
                if not links:
                    raw_links = soup.select("a[data-company], a[href*='/firma/'], a[href*='/company/']")
                    # Filtruj - wyklucz LinkedIn i inne zewnętrzne domeny
                    links = []
                    for link in raw_links:
                        href = link.get("href", "")
                        # Wyklucz LinkedIn i inne zewnętrzne domeny
                        if "linkedin.com" in href.lower() or "facebook.com" in href.lower() or "twitter.com" in href.lower():
                            continue
                        # Akceptuj tylko linki do panoramafirm.pl lub relatywne linki
                        if href.startswith("/") or "panoramafirm.pl" in href.lower():
                            # Sprawdź czy to faktycznie link do firmy (zawiera /firma/ lub podobne)
                            if "/firma/" in href.lower() or (href.startswith("/") and len(href.split("/")) >= 3):
                                links.append(link)
                    if raw_links and not links:
                        log(f"  DEBUG: Found {len(raw_links)} links via selector 2, but all were filtered out (external links)")
                    elif links:
                        log(f"  DEBUG: Found {len(links)} links via selector 2 (after filtering external links)")
                
                # 3. Selektor w sekcji z wynikami
                if not links:
                    links = soup.select(".results a, .listing a, .companies a, .firmy a")
                    if links:
                        log(f"  DEBUG: Found {len(links)} links via selector 3 (.results, .listing, .companies, .firmy)")
                
                # 4. Selektor z h2/h3 (nagłówki z linkami do firm)
                if not links:
                    links = soup.select("h2 a, h3 a, .company-title a, .title a")
                    if links:
                        log(f"  DEBUG: Found {len(links)} links via selector 4 (h2/h3, .company-title, .title)")
                
                # 5. Stary selektor dla kompatybilności
                if not links:
                    links = soup.select("a.company-name, .company-name a")
                    if links:
                        log(f"  DEBUG: Found {len(links)} links via selector 5 (a.company-name)")
                
                # 6. Szukaj w sekcjach z wynikami - różne możliwe struktury
                if not links:
                    # Spróbuj znaleźć kontenery z wynikami
                    result_containers = soup.select("article, .card, .item, .entry, [class*='result'], [class*='item'], [class*='entry'], [class*='listing'], [class*='company'], [class*='firma'], [class*='business']")
                    for container in result_containers:
                        container_links = container.select("a[href]")
                        for link in container_links:
                            href = link.get("href", "")
                            if href and href.startswith("/") and len(href) > 5:
                                # Sprawdź czy to może być link do firmy
                                exclude_list = ["/kategoria/", "/category/", "/wojewodztwo/", "/miasto/", "/firmy,", ".html#", "javascript:", "mailto:", "tel:", "/blog/", "/strona/", "/dodaj-firme", "/dodaj-firmę"]
                                if not any(exclude in href.lower() for exclude in exclude_list):
                                    links.append(link)
                
                # 6b. Szukaj w tabelach (może być tabela z wynikami)
                if not links:
                    tables = soup.select("table")
                    for table in tables:
                        table_links = table.select("a[href]")
                        for link in table_links:
                            href = link.get("href", "")
                            text = link.get_text(strip=True)
                            if href and text and len(text) > 3 and href.startswith("/"):
                                exclude_list = ["/kategoria/", "/category/", "/wojewodztwo/", "/miasto/", "/firmy,", ".html#", "javascript:", "mailto:", "tel:", "/dodaj-firme", "/dodaj-firmę"]
                                if not any(exclude in href.lower() for exclude in exclude_list):
                                    links.append(link)
                
                # 7. Agresywne szukanie - wszystkie linki które mogą być firmami
                if not links:
                    all_links = soup.select("a[href]")
                    filtered_links = []
                    
                    for a in all_links:
                        href = a.get("href", "")
                        if not href:
                            continue
                            
                        href_lower = href.lower()
                        text = a.get_text(strip=True)
                        
                        # Wyklucz znane nie-firmy
                        exclude_patterns = [
                            "/kategoria/", "/category/", "/wojewodztwo/", "/miasto/", "/firmy,",
                            ".html#", "javascript:", "mailto:", "tel:", "/blog/", "/strona/", 
                            "/page/", "/kontakt", "/o-nas", "/regulamin", "/polityka", "/cookies",
                            "/szukaj", "/dodaj", "/login", "/rejestracja", "/admin", "/api/",
                            "/biuro", "/pomoc", "/cennik", "/dla-firm", "/dodaj-firme", "/dodaj-firmę"
                        ]
                        
                        if any(exclude in href_lower for exclude in exclude_patterns):
                            continue
                        
                        # Akceptuj linki które:
                        # 1. Zawierają /firma/ lub /company/
                        # 2. LUB są relatywne (/...), mają tekst i wyglądają jak profile (3+ segmenty w URL)
                        # 3. LUB są linkami zewnętrznymi do panoramafirm.pl z nazwą firmy
                        is_company_link = False
                        
                        if "/firma/" in href_lower:
                            # Upewnij się że to nie jest LinkedIn lub inna zewnętrzna domena
                            if "linkedin.com" not in href_lower and "facebook.com" not in href_lower and "twitter.com" not in href_lower:
                                is_company_link = True
                        elif href.startswith("/") and len(href.split("/")) >= 3:
                            # Link relatywny z 3+ segmentami (np. /miasto/firma/nazwa)
                            if text and len(text) > 2:
                                is_company_link = True
                        elif "panoramafirm.pl" in href_lower and text and len(text) > 3:
                            # Link zewnętrzny do PanoramaFirm z tekstem
                            if "/firma/" in href_lower or "/company/" in href_lower:
                                is_company_link = True
                        
                        if is_company_link:
                            filtered_links.append(a)
                    
                    links = filtered_links
                
                if not links:
                    # Debug: sprawdz jakie linki są na stronie
                    all_links = soup.select("a[href]")
                    log(f"    ⚠️  DEBUG: No company links found via standard selectors!")
                    log(f"    ⚠️  DEBUG: Total links on page: {len(all_links)}, HTML size: {len(html)} bytes")
                    
                    # Sprawdź czy strona może być pusta (brak firm w kategorii) lub używa JS do ładowania
                    page_text = soup.get_text()
                    if "brak wyników" in page_text.lower() or "no results" in page_text.lower() or "nie znaleziono" in page_text.lower():
                        log(f"    ℹ️  INFO: Page appears to have no results message")
                        break
                    
                    # AGRESYWNE podejście: sprawdź WSZYSTKIE linki i znajdź te które mogą być firmami
                    log(f"    🔍 DEBUG: Analyzing all {len(all_links)} links on page...")
                    potential_company_links = []
                    
                    for link in all_links:
                        href = link.get("href", "")
                        if not href:
                            continue
                            
                        href_lower = href.lower()
                        text = link.get_text(strip=True)
                        
                        # Wyklucz znane nie-firmy
                        exclude_patterns = [
                            "/kategoria/", "/category/", "/wojewodztwo/", "/miasto/", "/firmy,",
                            ".html#", "javascript:", "mailto:", "tel:", "/blog/", "/strona/", 
                            "/page/", "/kontakt", "/o-nas", "/regulamin", "/polityka", "/cookies",
                            "/szukaj", "/dodaj", "/login", "/rejestracja", "/admin", "/api/",
                            "/biuro", "/pomoc", "/cennik", "/dla-firm", "/wojewodztwa", "/miasta",
                            "/branze", "/branże", "/tag/", "/tagi/", "/dodaj-firme", "/dodaj-firmę"
                        ]
                        
                        if any(exclude in href_lower for exclude in exclude_patterns):
                            continue
                        
                        # Akceptuj linki które:
                        # 1. Mają tekst (nazwę firmy)
                        # 2. Są relatywne (/...) lub prowadzą do panoramafirm.pl
                        # 3. Nie są do znanych nie-firm
                        if not text or len(text) < 3:
                            continue
                        
                        # Sprawdź różne formaty URL firm
                        is_potential_company = False
                        
                        # Format 1: /miasto/firma/nazwa-firmy
                        if href.startswith("/") and len(href.split("/")) >= 3:
                            # Sprawdź czy nie jest to kategoria lub inna znana struktura
                            parts = href.split("/")
                            if len(parts) >= 3 and parts[1] not in ["kategoria", "category", "wojewodztwo", "miasto", "firmy"]:
                                is_potential_company = True
                        
                        # Format 2: /firma/nazwa-firmy lub /company/nazwa-firmy
                        elif "/firma/" in href_lower or "/company/" in href_lower:
                            is_potential_company = True
                        
                        # Format 3: Link zewnętrzny do panoramafirm.pl z /firma/
                        elif "panoramafirm.pl" in href_lower and ("/firma/" in href_lower or "/company/" in href_lower):
                            is_potential_company = True
                        
                        # Format 4: Link który wygląda jak nazwa firmy (ma tekst i nie jest do znanych stron)
                        elif href.startswith("/") and len(href) > 5 and text and len(text) > 5:
                            # Może być to link do firmy w nowym formacie
                            # Sprawdź czy tekst nie jest nazwą kategorii lub menu
                            menu_keywords = ["strona główna", "home", "o nas", "kontakt", "regulamin", "polityka"]
                            if not any(kw in text.lower() for kw in menu_keywords):
                                is_potential_company = True
                        
                        if is_potential_company:
                            potential_company_links.append({
                                "text": text[:50],
                                "href": href[:80]
                            })
                    
                    if potential_company_links:
                        log(f"    ✅ DEBUG: Found {len(potential_company_links)} potential company links!")
                        for i, pl in enumerate(potential_company_links[:10], 1):
                            log(f"      {i}. {pl['text']} -> {pl['href']}")
                        # Użyj znalezionych linków
                        links = [a for a in all_links if any(
                            a.get("href", "") == pl["href"] or 
                            (a.get("href", "").startswith(pl["href"]) and len(pl["href"]) > 10)
                            for pl in potential_company_links
                        )]
                        log(f"    ✅ Using {len(links)} links from potential matches")
                    else:
                        # Sprawdź czy może być problem z JavaScript
                        scripts = soup.select("script")
                        js_loaders = [s for s in scripts if s.string and ("fetch" in s.string or "ajax" in s.string or "load" in s.string.lower() or "xhr" in s.string.lower() or "axios" in s.string.lower() or "react" in s.string.lower() or "vue" in s.string.lower())]
                        if js_loaders:
                            log(f"    ⚠️  WARNING: Found {len(js_loaders)} scripts that might load content via JavaScript")
                            log(f"    ⚠️  WARNING: Page might need JavaScript to render company listings!")
                        
                        # Sprawdź czy strona ma puste kontenery które mogą być wypełniane przez JS
                        empty_containers = soup.select("[id*='result'], [class*='result'], [id*='listing'], [class*='listing'], [id*='company'], [class*='company']")
                        if empty_containers:
                            log(f"    ⚠️  WARNING: Found {len(empty_containers)} containers that might be filled by JavaScript")
                            # Sprawdź czy są puste (bez linków wewnątrz)
                            empty_count = sum(1 for c in empty_containers if not c.select("a[href]"))
                            if empty_count > 0:
                                log(f"    ⚠️  WARNING: {empty_count} of these containers are empty - likely JavaScript-loaded content!")
                        
                        # Sprawdź strukturę HTML
                        possible_containers = soup.select(".result, .listing-item, .company-item, .firma, [class*='company'], [class*='firma'], [class*='business'], [class*='result']")
                        log(f"    DEBUG: Found {len(possible_containers)} possible company containers")
                        
                        # Pokaż przykładowe linki
                        sample_links = [f"{a.get('href', '')[:60]} ({a.get_text(strip=True)[:30]})" for a in all_links[:10]]
                        log(f"    DEBUG: Sample links (first 10):")
                        for sl in sample_links:
                            log(f"      - {sl}")
                    
                    # Zapisz HTML do pliku debugowego (tylko pierwsza strona z problemem)
                    if page_num == 1:
                        debug_file = f"debug_listing_{int(time.time())}.html"
                        try:
                            with open(debug_file, "w", encoding="utf-8") as f:
                                f.write(html)
                            log(f"    DEBUG: Saved HTML to {debug_file} for inspection")
                            
                            # Dodatkowe debugowanie - sprawdź strukturę HTML
                            main_content = soup.select("main, .content, .main, #content, #main")
                            log(f"    DEBUG: Found {len(main_content)} main/content containers")
                            
                            # Sprawdź czy są jakieś listy lub tabele
                            lists = soup.select("ul, ol, .list, [class*='list']")
                            log(f"    DEBUG: Found {len(lists)} list elements")
                            
                            # Sprawdź czy są jakieś divy z klasami które mogą zawierać wyniki
                            divs_with_classes = soup.select("div[class]")
                            unique_classes = set()
                            for div in divs_with_classes[:100]:  # Sprawdź pierwsze 100
                                classes = div.get("class", [])
                                if classes:
                                    unique_classes.update(classes)
                            log(f"    DEBUG: Found {len(unique_classes)} unique CSS classes (sample): {list(unique_classes)[:20]}")
                            
                        except Exception as e:
                            log(f"    DEBUG: Could not save HTML: {e}")
                    
                    break

                # DEBUG: Pokaż znalezione linki przed przetwarzaniem
                if links:
                    log(f"  DEBUG: Processing {len(links)} found links...")
                    for i, link in enumerate(links[:5], 1):  # Pokaż pierwsze 5
                        href = link.get("href", "")
                        text = link.get_text(strip=True)
                        log(f"    Link {i}: href={href[:60]}, text={text[:50]}")

                new_count = 0
                for link in links:
                    href = link.get("href")
                    raw_text = link.get_text(strip=True)
                    name = normalize_text(raw_text)
            
                    # Wyklucz linki do formularzy i innych nie-firm
                    if href and ("/dodaj-firme" in href.lower() or "/dodaj-firmę" in href.lower()):
                        log(f"    DEBUG: Link rejected - add company form. href={href[:60]}")
                        continue
                    
                    # DEBUG: Sprawdź dlaczego linki są odrzucane
                    if not href:
                        log(f"    DEBUG: Link rejected - no href")
                        continue
                    if not name or len(name) < 2:
                        log(f"    DEBUG: Link rejected - no name or too short. href={href[:60]}, raw_text={raw_text[:40]}, normalized={name[:40]}")
                        continue
                    if href in seen_urls:
                        log(f"    DEBUG: Link rejected - already seen. href={href[:60]}, name={name[:40]}")
                        continue
                    
                    # Normalizuj href (może być relatywny)
                    if href.startswith("/"):
                        full_href = f"{BASE_URL}{href}"
                    elif href.startswith("http"):
                        full_href = href
                    else:
                        full_href = f"{BASE_URL}/{href}"
                    
                    seen_urls.add(href)
                    results.append({"name": name, "url": full_href})
                    new_count += 1
                    log(f"    DEBUG: Added link - name={name[:50]}, href={full_href[:80]}")

                if new_count == 0:
                    break

                # Opóźnienie między stronami
                time.sleep(random.uniform(LISTING_DELAY_MIN, LISTING_DELAY_MAX))
                page_num += 1
                
            except Exception as e:
                log(f"  ❌ Error on page {page_num}: {e}")
                break
        
        browser.close()
    
    return results


def fetch_company_data(session: requests.Session, company_url: str) -> tuple[dict | None, str | None]:
    """
    Pobiera stronę firmy używając Playwright (obsługuje JavaScript).
    Zwraca: (parsed_data, html_text) lub (None, None) przy błędzie.
    """
    url = safe_url(company_url)
    if not url:
        return (None, None)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Czekaj na załadowanie treści
            page.wait_for_selector('body', timeout=10000)
            
            # Przewiń stronę, żeby załadować lazy-loaded content
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(random.uniform(1, 2))
            
            # Pobierz HTML po wykonaniu JavaScript
            html = page.content()
            
            browser.close()
            
            # Najpierw próbuj stary sposób (var company =)
            js_data = extract_company_variable(html)
            if js_data:
                return (parse_company_from_js_legacy(js_data, html), html)

            # Nowy sposób - JSON-LD + HTML (2025+)
            parsed = parse_company_from_json_ld(html, company_url)
            if parsed:
                return (parsed, html)

            return (None, html)
        except Exception as e:
            log(f"  Company fetch error: {e}")
            try:
                browser.close()
            except:
                pass
            return (None, None)


def parse_company_from_json_ld(html: str, source_url: str) -> dict | None:
    """
    Parsuje dane firmy z JSON-LD (LocalBusiness) + HTML.
    Nowa struktura PanoramaFirm (2025+).
    """
    soup = BeautifulSoup(html, "html.parser")
    data = {}

    # Szukamy JSON-LD z LocalBusiness
    json_ld_scripts = soup.select('script[type="application/ld+json"]')
    ld_data = None

    for script in json_ld_scripts:
        try:
            parsed = json.loads(script.string)
            if isinstance(parsed, list):
                for item in parsed:
                    if item.get("@type") == "LocalBusiness":
                        ld_data = item
                        break
            elif isinstance(parsed, dict) and parsed.get("@type") == "LocalBusiness":
                ld_data = parsed
            if ld_data:
                break
        except Exception:
            continue

    if not ld_data:
        return None

    # Podstawowe dane z JSON-LD
    data["name"] = ld_data.get("name")
    data["phone"] = ld_data.get("telephone")

    # Adres z JSON-LD
    addr = ld_data.get("address", {})
    data["city"] = addr.get("addressLocality")
    data["address"] = addr.get("streetAddress")
    data["zip"] = addr.get("postalCode")

    # Koordynaty z JSON-LD (jeśli są)
    geo = ld_data.get("geo", {})
    data["lat"] = geo.get("latitude")
    data["lng"] = geo.get("longitude")

    # Province z URL (format: /wojewodztwo,,miasto,ulica/nazwa.html)
    try:
        url_path = source_url.split("panoramafirm.pl")[-1] if "panoramafirm.pl" in source_url else source_url
        url_parts = url_path.strip("/").split("/")
        if url_parts:
            location_part = url_parts[0]  # np. "podlaskie,,białystok,ogrodowa,19"
            loc_parts = location_part.split(",")
            if loc_parts:
                province_raw = loc_parts[0].replace("_", "-")
                data["province"] = normalize_province(province_raw)
    except Exception:
        data["province"] = None

    # Email z HTML
    email_link = soup.select_one('a[href^="mailto:"]')
    if email_link:
        email = email_link.get("href", "").replace("mailto:", "").split("?")[0]
        data["email"] = email if "@" in email else None
    else:
        data["email"] = None

    # WWW z HTML (szukamy linku zewnętrznego)
    www = None
    for link in soup.select('a[href^="http"]'):
        href = link.get("href", "")
        # Pomijamy linki do PanoramaFirm, social media, itp.
        skip_domains = ["panoramafirm", "facebook", "google", "twitter", "instagram", "linkedin", "youtube"]
        if not any(domain in href.lower() for domain in skip_domains):
            www = href
            break
    data["website"] = normalize_website(www)

    # NIP z HTML
    data["nip"] = extract_nip_from_profile_html(html)

    # Opis - szukamy w różnych miejscach
    raw_desc = ""
    desc_selectors = [
        '[class*="description"]', '[class*="about"]', 
        '#description', '#about', '[class*="info-text"]'
    ]
    for selector in desc_selectors:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator="\n", strip=True)
            if len(text) > len(raw_desc):
                raw_desc = text
    data["raw_desc"] = raw_desc

    return data


def parse_company_from_js_legacy(js_data: dict, html_fallback: str | None = None) -> dict:
    """
    Stary parser dla struktur z var company = {...}
    Zachowany dla kompatybilności wstecznej.
    """
    data = {}

    # --- NIP (preferuj JS, fallback HTML) ---
    nip = js_data.get("nip")
    nip_digits = None
    if isinstance(nip, str):
        nip_digits = re.sub(r"\D", "", nip)
        if not re.fullmatch(r"\d{10}", nip_digits):
            nip_digits = None

    if not nip_digits and html_fallback:
        nip_digits = extract_nip_from_profile_html(html_fallback)

    data["nip"] = nip_digits

    # --- Contact (może być null) ---
    contact = js_data.get("contact") or {}
    data["email"] = contact.get("email")
    data["website"] = normalize_website(contact.get("www"))

    phone = contact.get("phone")
    if isinstance(phone, dict):
        data["phone"] = phone.get("formatted") or phone.get("number")
    else:
        data["phone"] = phone

    # --- Location ---
    loc = js_data.get("location") or {}

    city = loc.get("city")
    data["city"] = city.get("name") if isinstance(city, dict) else city

    street = loc.get("street")
    if isinstance(street, dict):
        s_name = (street.get("name") or "").strip()
        s_number = (street.get("number") or "").strip()
        data["address"] = f"{s_name} {s_number}".strip() if s_name or s_number else None
    else:
        data["address"] = street

    data["zip"] = loc.get("zip")

    voiv = loc.get("voivodeship")
    prov = voiv.get("name") if isinstance(voiv, dict) else None
    data["province"] = normalize_province(prov)

    coords = loc.get("coordinates")
    if isinstance(coords, dict):
        data["lat"] = coords.get("lat")
        data["lng"] = coords.get("lon")

    # --- opis surowy (jak było) ---
    parts = []
    for field in ["announcementBrief", "products", "summary"]:
        txt = clean_html_text(js_data.get(field)).strip()
        if len(txt) >= 10:
            parts.append(txt)
    data["raw_desc"] = "\n\n".join(parts).strip()

    # Dodaj nazwę z js_data
    data["name"] = js_data.get("name")

    return data


# =========================
# INSERT (DO NOTHING) + sourceUrl
# =========================
def insert_company_do_nothing(conn, payload: dict) -> bool:
    """
    True jeśli wstawiono, False jeśli konflikt (np. sourceUrl już istnieje).
    """
    cur = conn.cursor()
    sql = """
    INSERT INTO "Company"
    (id, "tenantId", name, slug, address, city, province, zip, phone, email, website,
     description, "categoryId", plan, "isVerified", nip, lat, lng, "sourceUrl", "createdAt", "updatedAt")
    VALUES
    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
     %s, %s, 'FREE', false, %s, %s, %s, %s, NOW(), NOW())
    ON CONFLICT ("sourceUrl") DO NOTHING
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
            payload.get("sourceUrl"),
        ),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return row is not None


# =========================
# PIPELINE
# =========================
def process_company(conn, session: requests.Session, listing_item: dict, category_name: str) -> bool:
    global total_inserted

    listing_name = normalize_text(listing_item.get("name"))
    if not listing_name:
        return False

    profile_url = safe_url(listing_item.get("url"))
    if not profile_url:
        return False

    # EARLY SKIP
    if company_exists_by_source_url(conn, profile_url):
        return False

    tenant_id, tenant_subdomain = get_tenant_id_by_category(conn, category_name)
    category_id = get_or_create_category(conn, tenant_id, category_name)

    parsed, html = fetch_company_data(session, profile_url)
    if not parsed:
        return False

    # preferuj nazwę z parsowanych danych (zachowuje cudzysłowy/pełną nazwę)
    company_name = normalize_text(parsed.get("name") or listing_name)
    if not company_name:
        company_name = listing_name

    raw_desc = parsed.get("raw_desc") or ""
    city = parsed.get("city")
    website = parsed.get("website")
    nip = parsed.get("nip")
    province = parsed.get("province")

    slug = get_unique_slug(conn, tenant_id, company_name)

    # opis
    description = None
    if USE_AI_REWRITE:
        if len(raw_desc.strip()) < MIN_RAW_DESC_FOR_DIRECT_USE:
            source_text = f"Firma: {company_name}. Kategoria: {category_name}. Lokalizacja: {city or 'Polska'}."
        else:
            source_text = raw_desc

        while True:
            try:
                if REQUIRE_AI and not OPENAI_API_KEY:
                    log(f"REQUIRE_AI=true, ale brak OPENAI_API_KEY. Sleeping {AI_RETRY_CHECK_SECONDS}s...")
                    time.sleep(AI_RETRY_CHECK_SECONDS)
                    continue

                description = rewrite_description_with_ai_strict(
                    source_text=source_text,
                    company_name=company_name,
                    category_name=category_name,
                    city=city,
                )
                break
            except Exception as e:
                log(f"AI strict mode: waiting and retrying. Reason: {e}")
                continue
    else:
        # bez AI: wrzuć surowy opis jeśli jest, inaczej NULL
        description = raw_desc if len(raw_desc.strip()) >= MIN_RAW_DESC_FOR_DIRECT_USE else None

    payload = {
        "id": str(uuid.uuid4()),
        "tenantId": tenant_id,
        "categoryId": category_id,
        "name": company_name,
        "slug": slug,
        "description": description,
        "address": parsed.get("address"),
        "city": city,
        "province": province,
        "zip": parsed.get("zip"),
        "phone": parsed.get("phone"),
        "email": parsed.get("email"),
        "website": website,
        "nip": nip,
        "lat": parsed.get("lat"),
        "lng": parsed.get("lng"),
        "sourceUrl": profile_url,
    }

    inserted = insert_company_do_nothing(conn, payload)
    if inserted:
        total_inserted += 1
        log(f"  INSERT OK [{tenant_subdomain}] {company_name[:60]} | slug={slug} | desc={len(description or '')}")
        return True

    return False


def main():
    log(
        f"Mode={SCRAPER_MODE} | REQUIRE_AI={'YES' if REQUIRE_AI else 'NO'} | "
        f"MAX_PAGES_PER_CATEGORY={MAX_PAGES_PER_CATEGORY} | AI_MODEL={OPENAI_MODEL}"
    )

    conn = connect_db()
    categories = scrape_all_categories()
    log(f"Kategorie (from list): {len(categories)}")

    session = requests.Session()
    session.headers.update(HEADERS)

    try:
        for i, cat in enumerate(categories, 1):
            cat_name = normalize_text(cat["name"])
            cat_url = cat["url"]
            log(f"\n[{i}/{len(categories)}] Category: {cat_name} -> {cat_url}")

            companies = scrape_category_listing_until_end(session, cat_url)
            log(f"  Listing items: {len(companies)}")

            for j, item in enumerate(companies, 1):
                log(f"  ({j}/{len(companies)}) {item.get('name','')[:60]}")
                process_company(conn, session, item, category_name=cat_name)
                time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

    finally:
        conn.close()

    log(f"\nDONE. Inserted={total_inserted} | AI used={ai_usage_counter}")


if __name__ == "__main__":
    main()