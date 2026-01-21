# ⚡ Szybki przewodnik deploy na Coolify

## ✅ Migracja jest bezpieczna - możesz deployować bez obaw!

### Co się stanie:

1. **Coolify zbuduje nowy obraz** z zaktualizowanym kodem
2. **start.sh automatycznie:**
   - Zastosuje migrację przez `prisma migrate deploy`
   - Jeśli migracja się nie powiedzie, bezpiecznie doda kolumny przez SQL
3. **Aplikacja uruchomi się** - bez przestoju

### Migracja dodaje tylko:
- Kolumna `description` (TEXT, nullable) - dla opisu zapytania
- Kolumna `source` (TEXT, nullable) - dla źródła leada

**Żadne dane nie są usuwane ani modyfikowane!** ✅

## 🚀 Deploy w Coolify:

1. **Push do repozytorium:**
   ```bash
   git add .
   git commit -m "Add lead tracking with description and source"
   git push
   ```

2. **Coolify automatycznie:**
   - Wykryje zmiany
   - Zbuduje nowy obraz
   - Uruchomi migrację
   - Wystartuje aplikację

3. **Sprawdź czy działa:**
   - Wejdź na `/admin/leads` - powinno działać
   - Sprawdź czy widzisz kolumny "Opis/Źródło" w tabeli

## 🔍 Weryfikacja po deploy:

```sql
-- Sprawdź czy kolumny zostały dodane
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Lead' 
AND column_name IN ('description', 'source');
```

Powinno zwrócić:
```
column_name | data_type | is_nullable
description | text      | YES
source      | text      | YES
```

## ⚠️ Jeśli coś pójdzie nie tak:

Skrypt `start.sh` ma automatyczny fallback - jeśli migracja się nie powiedzie, kolumny zostaną dodane bezpiecznie przez SQL z sprawdzeniem `IF NOT EXISTS`.

**Nie musisz się martwić - wszystko jest zabezpieczone!** 🛡️
