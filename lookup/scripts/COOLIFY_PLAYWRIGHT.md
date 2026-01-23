# Uruchamianie Scrapera z Playwright na Coolify

## Wymagania

Scraper z Playwright wymaga:
- ✅ Zainstalowanego Playwright i przeglądarek
- ✅ Zależności systemowych dla Chromium
- ✅ Więcej pamięci RAM (minimum 1GB, zalecane 2GB+)

## Metoda 1: Użycie Dockerfile (Zalecane)

### Krok 1: Przygotuj Dockerfile

Upewnij się, że masz zaktualizowany `Dockerfile` w katalogu `scripts/`:

```dockerfile
# Dockerfile już zawiera wszystkie potrzebne zależności
# Zobacz: lookup/scripts/Dockerfile
```

### Krok 2: Skonfiguruj aplikację w Coolify

1. **Utwórz nową aplikację** w Coolify (lub edytuj istniejącą)
2. **Wybierz źródło**: Git Repository
3. **Katalog build**: `lookup/scripts`
4. **Dockerfile**: Użyj `Dockerfile` z katalogu `scripts/`

### Krok 3: Ustaw zmienne środowiskowe

W ustawieniach aplikacji w Coolify dodaj:

```
DB_HOST=twoj-host
DB_PORT=5432
DB_NAME=twoja-baza
DB_USER=twoj-user
DB_PASS=twoje-haslo
OPENAI_API_KEY=twoj-klucz
SCRAPER_MODE=MAIN
MAX_PAGES_PER_CATEGORY=5
```

### Krok 4: Ustaw zasoby

**Ważne**: Playwright wymaga więcej zasobów:
- **RAM**: Minimum 1GB, zalecane 2GB+
- **CPU**: Minimum 1 core, zalecane 2 cores

W Coolify:
- Settings → Resources
- Ustaw odpowiednie limity

### Krok 5: Deploy

Kliknij "Deploy" i poczekaj na zbudowanie obrazu.

## Metoda 2: Uruchomienie przez Terminal Coolify

Jeśli scraper jest już w kontenerze, możesz uruchomić go ręcznie:

1. **Otwórz Terminal** w Coolify dla swojej aplikacji
2. **Uruchom scraper**:

```bash
cd /app
python scraper.py
```

## Metoda 3: Cron Job / Scheduled Task

Aby uruchamiać scraper automatycznie:

### Opcja A: Cron w kontenerze

1. **Dodaj do Dockerfile** (przed `CMD`):

```dockerfile
# Zainstaluj cron
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# Skopiuj crontab
COPY crontab /etc/cron.d/scraper-cron
RUN chmod 0644 /etc/cron.d/scraper-cron
RUN crontab /etc/cron.d/scraper-cron

# Uruchom cron w tle
CMD cron && tail -f /dev/null
```

2. **Utwórz plik `crontab`**:

```
0 2 * * * cd /app && python scraper.py >> /var/log/scraper.log 2>&1
```

### Opcja B: Coolify Scheduled Tasks

W Coolify możesz użyć "Scheduled Tasks":
- Settings → Scheduled Tasks
- Dodaj nowe zadanie
- Command: `python /app/scraper.py`
- Schedule: np. `0 2 * * *` (codziennie o 2:00)

## Troubleshooting

### Problem: "playwright not installed"

**Rozwiązanie**: Upewnij się, że Dockerfile zawiera:
```dockerfile
RUN playwright install chromium
RUN playwright install-deps chromium
```

### Problem: "Executable doesn't exist"

**Rozwiązanie**: Sprawdź czy wszystkie zależności systemowe są zainstalowane w Dockerfile.

### Problem: "Out of memory" / Kontener się restartuje

**Rozwiązanie**: 
- Zwiększ limit RAM w Coolify (Settings → Resources)
- Użyj `headless=True` (już jest w kodzie)
- Zmniejsz `MAX_PAGES_PER_CATEGORY`

### Problem: Scraper jest bardzo wolny

**To normalne** - Playwright jest wolniejszy niż requests, bo:
- Uruchamia prawdziwą przeglądarkę
- Czeka na załadowanie JavaScript
- Wymaga więcej zasobów

**Opcje optymalizacji**:
- Zmniejsz timeouty (ale może być mniej niezawodne)
- Użyj `wait_until='domcontentloaded'` zamiast `networkidle` (szybsze)
- Zwiększ opóźnienia między requestami, żeby uniknąć blokowania

### Problem: Screenshoty debugowe nie zapisują się

**Rozwiązanie**: Screenshoty zapisują się w kontenerze. Aby je zobaczyć:
1. Użyj Terminal w Coolify
2. Sprawdź katalog `/app`:
```bash
ls -la /app/debug_*.png
```

Lub dodaj volume do Dockerfile:
```dockerfile
VOLUME ["/app/debug"]
```

## Sprawdzenie czy Playwright działa

W Terminal Coolify:

```bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
```

Lub uruchom test:

```bash
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('https://example.com')
    print('Playwright działa!')
    browser.close()
"
```

## Monitorowanie

### Logi

Logi scrapera są widoczne w:
- Coolify → Logs (dla aplikacji)
- Terminal → `tail -f /var/log/scraper.log` (jeśli używasz cron)

### Metryki

Monitoruj:
- **RAM usage** - Playwright zużywa więcej pamięci
- **CPU usage** - Szczególnie podczas uruchamiania przeglądarki
- **Czas wykonania** - Playwright jest wolniejszy

## Przykładowa konfiguracja Coolify

### Build Settings:
- **Build Pack**: Dockerfile
- **Dockerfile Path**: `scripts/Dockerfile`
- **Build Context**: `scripts/`

### Resources:
- **Memory**: 2048 MB
- **CPU**: 2 cores

### Environment Variables:
```
DB_HOST=pkgkgg80c80s0g888048004o
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=twoje-haslo
OPENAI_API_KEY=sk-...
SCRAPER_MODE=MAIN
MAX_PAGES_PER_CATEGORY=5
SCRAPE_ALL_CATEGORIES=false
```

## Alternatywa: Uruchomienie jako jednorazowy job

Jeśli nie chcesz mieć ciągle działającego kontenera:

1. **Utwórz aplikację** w Coolify
2. **Ustaw restart policy**: `never` lub `on-failure`
3. **Uruchom ręcznie** przez Terminal lub Scheduled Task
4. **Kontener zakończy się** po zakończeniu scrapera

## Wsparcie

Jeśli masz problemy:
1. Sprawdź logi w Coolify
2. Sprawdź screenshoty debugowe (jeśli są)
3. Sprawdź czy Playwright jest zainstalowany: `playwright --version`
4. Sprawdź zasoby kontenera w Coolify
