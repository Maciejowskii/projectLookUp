# syntax=docker/dockerfile:1

FROM python:3.13-slim

# Ustawienia podstawowe
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Systemowe zależności potrzebne m.in. dla psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    "openai==1.55.3" \
    "httpx==0.27.2" \
    psycopg2-binary \
    requests \
    beautifulsoup4 \
    python-dotenv


# Skopiuj tylko to, co potrzebne
COPY scraper.py /app/scraper.py

# Domyślna komenda – jednorazowe uruchomienie scrapera
CMD ["python", "scraper.py"]
