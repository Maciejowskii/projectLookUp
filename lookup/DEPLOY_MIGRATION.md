# 🚀 Bezpieczne wdrożenie migracji na produkcję (Coolify)

## ✅ Migracja jest bezpieczna

Migracja `20250115000000_add_description_and_source_to_leads` jest **w pełni bezpieczna**:
- ✅ **Dodaje tylko nowe kolumny** (`description`, `source`)
- ✅ **Nie usuwa żadnych danych**
- ✅ **Kolumny są nullable** (opcjonalne) - istniejące rekordy nie są naruszone
- ✅ **Używa IF NOT EXISTS** - można uruchomić wielokrotnie bez błędów

## 📋 Co się stanie podczas deploy

### Automatycznie (przez start.sh):

1. **Prisma migrate deploy** - zastosuje nową migrację
2. **Bezpieczne dodanie kolumn** - jeśli migracja się nie powiedzie, skrypt doda kolumny ręcznie z IF NOT EXISTS
3. **Aplikacja uruchomi się normalnie** - bez przestoju

### Struktura danych po migracji:

```sql
ALTER TABLE "Lead" ADD COLUMN "description" TEXT;  -- NULL dla starych rekordów
ALTER TABLE "Lead" ADD COLUMN "source" TEXT;      -- NULL dla starych rekordów
```

## 🔒 Bezpieczeństwo

### Przed deploy (opcjonalnie - zalecane):

1. **Zrób backup bazy danych:**
   ```bash
   # W Coolify - użyj narzędzia do backupu lub:
   pg_dump $DATABASE_URL > backup_before_migration.sql
   ```

2. **Sprawdź czy masz dostęp do bazy:**
   - W Coolify: Settings → Database → Connection String

### Podczas deploy:

1. **Coolify automatycznie:**
   - Zbuduje nowy obraz Docker
   - Uruchomi `start.sh` który:
     - Zastosuje migrację przez `prisma migrate deploy`
     - Jeśli migracja się nie powiedzie, doda kolumny bezpiecznie przez SQL
   - Uruchomi aplikację

2. **Nie ma przestoju** - migracja dodaje tylko kolumny (operacja szybka)

### Po deploy:

1. **Sprawdź czy wszystko działa:**
   - Wejdź na `/admin/leads` - powinno działać
   - Sprawdź czy nowe leady mają pola `description` i `source`

2. **Weryfikacja w bazie (opcjonalnie):**
   ```sql
   -- Sprawdź czy kolumny istnieją
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'Lead' 
   AND column_name IN ('description', 'source');
   ```

## 🛠️ Ręczne wykonanie migracji (jeśli potrzebne)

Jeśli chcesz wykonać migrację ręcznie przed deploy:

```bash
# 1. Połącz się z bazą danych
psql $DATABASE_URL

# 2. Sprawdź czy kolumny już istnieją
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Lead' AND column_name IN ('description', 'source');

# 3. Jeśli nie istnieją, dodaj je:
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source" TEXT;

# 4. Oznacz migrację jako zastosowaną
npx prisma migrate resolve --applied 20250115000000_add_description_and_source_to_leads
```

## ⚠️ Co jeśli coś pójdzie nie tak?

### Jeśli migracja się nie powiedzie:

1. **Skrypt start.sh automatycznie doda kolumny** przez bezpieczne SQL z IF NOT EXISTS
2. **Aplikacja uruchomi się normalnie** - nie będzie błędu

### Jeśli chcesz cofnąć migrację (rollback):

```sql
-- Usuń kolumny (UWAGA: stracisz dane w tych kolumnach!)
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "description";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "source";
```

## ✅ Checklist przed deploy

- [ ] Kod jest w repozytorium (git push)
- [ ] Migracja jest w folderze `prisma/migrations/`
- [ ] Schema Prisma jest zaktualizowana
- [ ] (Opcjonalnie) Backup bazy danych
- [ ] Coolify ma dostęp do zmiennej `DATABASE_URL`

## 🎯 Podsumowanie

**Migracja jest bezpieczna i nie wymaga specjalnych przygotowań.** 

Po prostu zrób normalny deploy w Coolify - wszystko zadziała automatycznie! 🚀
