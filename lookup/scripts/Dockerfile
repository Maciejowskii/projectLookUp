# syntax=docker/dockerfile:1

FROM python:3.13-slim

# Ustawienia podstawowe
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Systemowe zależności:
# - build-essential, libpq-dev dla psycopg2
# - Zależności dla Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    # Zależności dla Playwright/Chromium
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Zainstaluj zależności Pythona (z requirements.txt)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Zainstaluj przeglądarki Playwright (tylko Chromium dla mniejszego rozmiaru)
RUN playwright install chromium

# Zainstaluj dodatkowe pakiety fontów potrzebne dla Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-unifont \
    && rm -rf /var/lib/apt/lists/*

# Uwaga: pomijamy 'playwright install-deps' ponieważ:
# 1. Większość zależności jest już zainstalowana ręcznie powyżej
# 2. 'playwright install-deps' próbuje zainstalować stare pakiety (ttf-unifont, ttf-ubuntu-font-family)
#    które nie są dostępne w Debian Trixie (python:3.13-slim)
# 3. Zainstalowaliśmy już fonts-unifont jako zamiennik dla ttf-unifont
# 4. fonts-liberation jest już zainstalowane w pierwszym RUN

# Skopiuj tylko to, co potrzebne
COPY scraper.py /app/scraper.py

# Domyślna komenda – jednorazowe uruchomienie scrapera
CMD ["python", "scraper.py"]
