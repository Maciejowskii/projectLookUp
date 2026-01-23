# Playwright Setup dla Scrapera

## Instalacja

Scraper został zaktualizowany, aby używać Playwright zamiast requests/BeautifulSoup. Playwright obsługuje JavaScript, co jest kluczowe dla nowoczesnych stron.

### 1. Zainstaluj Playwright

```bash
pip install playwright
```

Lub jeśli używasz requirements.txt:

```bash
pip install -r requirements.txt
```

### 2. Zainstaluj przeglądarki

Playwright wymaga zainstalowania przeglądarek:

```bash
playwright install chromium
```

Lub zainstaluj wszystkie:

```bash
playwright install
```

### 3. Weryfikacja

Sprawdź czy Playwright działa:

```bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
```

## Zmiany w scraperze

### Funkcje zaktualizowane na Playwright:

1. **`scrape_category_listing_until_end()`** - teraz używa Playwright do pobierania list firm
2. **`fetch_company_data()`** - teraz używa Playwright do pobierania szczegółów firmy

### Zalety Playwright:

- ✅ Obsługuje JavaScript (strony renderowane przez JS)
- ✅ Czeka na załadowanie treści (`wait_until='networkidle'`)
- ✅ Może przewijać stronę, żeby załadować lazy-loaded content
- ✅ Może robić screenshoty do debugowania
- ✅ Lepsze wykrywanie elementów (czeka na selektory)

### Uwagi:

- Playwright jest wolniejszy niż requests (uruchamia prawdziwą przeglądarkę)
- Wymaga więcej zasobów (pamięć, CPU)
- Dla lepszej wydajności użyj `headless=True` (domyślnie)

## Troubleshooting

### Błąd: "playwright not installed"

```bash
pip install playwright
playwright install chromium
```

### Błąd: "Executable doesn't exist"

```bash
playwright install chromium
```

### Błąd: "Timeout waiting for selector"

- Zwiększ timeout w kodzie (domyślnie 10 sekund)
- Sprawdź czy selektor jest poprawny
- Sprawdź screenshoty debugowe (zapisują się automatycznie)

### Wydajność

Jeśli scraper jest zbyt wolny:
- Użyj `headless=True` (już jest ustawione)
- Zmniejsz `wait_until` z `networkidle` na `domcontentloaded` (szybsze, ale mniej niezawodne)
- Zwiększ opóźnienia między requestami, żeby uniknąć blokowania

## Przykładowe użycie

Scraper działa tak samo jak wcześniej - zmiany są wewnętrzne:

```python
from scraper import scrape_category_listing_until_end, fetch_company_data
import requests

session = requests.Session()  # Nadal potrzebny dla kompatybilności
results = scrape_category_listing_until_end(session, "https://panoramafirm.pl/kategoria/hydraulik")
```
