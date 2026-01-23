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
RUN playwright install-deps chromium

# Skopiuj tylko to, co potrzebne
COPY scraper.py /app/scraper.py

# Domyślna komenda – jednorazowe uruchomienie scrapera
CMD ["python", "scraper.py"]
