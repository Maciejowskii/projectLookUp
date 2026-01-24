# 🚀 Instrukcja Deploy w Coolify

Ten dokument opisuje jak skonfigurować automatyczne wdrożenie aplikacji w Coolify.

## 📋 Wymagania

- Coolify zainstalowany i skonfigurowany
- Aplikacja dodana do Coolify
- Zmienna środowiskowa `DATABASE_URL` ustawiona w Coolify

## 🔧 Konfiguracja w Coolify

### Opcja 1: Użyj Post-Deploy Script (Zalecane)

1. **Przejdź do ustawień aplikacji w Coolify**
2. **Znajdź sekcję "Post Deploy Command"** (lub "Healthcheck" / "Execute Command")
3. **Dodaj następującą komendę:**

```bash
bash /app/coolify-post-deploy.sh
```

4. **Lub jeśli chcesz uruchomić ręcznie po deploy:**

```bash
chmod +x /app/coolify-post-deploy.sh && /app/coolify-post-deploy.sh
```

### Opcja 2: Automatyczne uruchomienie przez start.sh

Skrypt `start.sh` już zawiera wszystkie potrzebne kroki i uruchamia się automatycznie przy starcie kontenera. Jeśli używasz `start.sh` jako CMD w Dockerfile, wszystko powinno działać automatycznie.

## 📝 Co robi skrypt post-deploy?

Skrypt `coolify-post-deploy.sh` automatycznie:

1. ✅ **Sprawdza połączenie z bazą danych**
2. ✅ **Oznacza znane migracje jako zastosowane** (zapobiega konfliktom)
3. ✅ **Zastosowuje nowe migracje Prisma**
4. ✅ **Synchronizuje schemat bazy danych** (dodaje brakujące kolumny/tabele)
5. ✅ **Generuje Prisma Client** (ważne po zmianach w schemacie)
6. ✅ **Sprawdza czy istnieje domyślny tenant** (opcjonalnie)
7. ✅ **Wyświetla podsumowanie i wersje**

## 🔄 Proces Deploy

### Automatyczny (przez Dockerfile)

1. Coolify buduje obraz Docker (`Dockerfile.web`)
2. Podczas build:
   - Instaluje zależności (`npm install`)
   - Generuje Prisma Client (`npx prisma generate`)
   - Buduje aplikację Next.js (`npm run build`)
3. Przy starcie kontenera:
   - Uruchamia się `start.sh` (CMD w Dockerfile)
   - `start.sh` wykonuje wszystkie migracje i synchronizację
   - Uruchamia aplikację (`npm run start`)

### Ręczny (przez Post-Deploy Command)

1. Po deploy uruchom `coolify-post-deploy.sh`
2. Skrypt wykona wszystkie potrzebne kroki
3. Aplikacja jest gotowa do użycia

## 🛠️ Rozwiązywanie problemów

### Problem: Migracje nie są stosowane

**Rozwiązanie:**
```bash
# Sprawdź logi kontenera
docker logs <container-name>

# Uruchom migracje ręcznie
npx prisma migrate deploy
```

### Problem: Błąd "DATABASE_URL is not set"

**Rozwiązanie:**
1. Przejdź do ustawień aplikacji w Coolify
2. Dodaj zmienną środowiskową `DATABASE_URL`
3. Format: `postgresql://user:password@host:port/database`

### Problem: Prisma Client nie jest wygenerowany

**Rozwiązanie:**
```bash
# Wygeneruj ręcznie
npx prisma generate
```

### Problem: Kolumny/tabele nie istnieją

**Rozwiązanie:**
```bash
# Uruchom synchronizację schematu
bash /app/coolify-post-deploy.sh
```

## 📊 Sprawdzenie statusu

### Sprawdź czy aplikacja działa:

```bash
# W terminalu Coolify lub przez SSH
curl http://localhost:3000/api/health
```

### Sprawdź logi:

```bash
# W Coolify: przejdź do aplikacji → Logs
# Lub przez terminal:
docker logs <container-name> -f
```

### Sprawdź bazę danych:

```bash
# Połącz się z bazą
psql $DATABASE_URL

# Sprawdź tabele
\dt

# Sprawdź migracje
SELECT * FROM "_prisma_migrations";
```

## 🔐 Bezpieczeństwo

- ✅ Wszystkie operacje są **idempotentne** (można uruchomić wielokrotnie)
- ✅ Używa `IF NOT EXISTS` - nie nadpisuje istniejących danych
- ✅ Nie usuwa żadnych danych
- ✅ Kolumny są nullable - nie psuje istniejących rekordów

## 📞 Wsparcie

Jeśli masz problemy:

1. Sprawdź logi w Coolify
2. Sprawdź logi kontenera: `docker logs <container-name>`
3. Uruchom skrypt ręcznie i sprawdź output
4. Sprawdź czy `DATABASE_URL` jest poprawnie ustawione

## 🎯 Quick Start

**Minimalna konfiguracja w Coolify:**

1. Dodaj aplikację do Coolify
2. Ustaw `DATABASE_URL` w zmiennych środowiskowych
3. Deploy!

Wszystko powinno działać automatycznie dzięki `start.sh` 🚀
