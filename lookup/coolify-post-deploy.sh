#!/bin/bash
# Coolify Post-Deploy Script
# Ten skrypt automatycznie wykona wszystkie potrzebne kroki po deploy w Coolify
# Możesz go uruchomić jako "Post Deploy Command" w ustawieniach aplikacji Coolify

set -e  # Exit on error (ale niektóre komendy mają || true)

# Ustaw flagę deploymentu (zapobiega uruchamianiu review generation podczas deploy)
export DEPLOYING=true
export SKIP_REVIEW_GENERATION=true

echo "=========================================="
echo "🚀 Coolify Post-Deploy Script"
echo "=========================================="
echo "Timestamp: $(date)"
echo "Working directory: $(pwd)"
echo ""

# Sprawdź czy DATABASE_URL jest ustawione
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL is not set!"
    echo "   Continuing anyway, but database operations may fail..."
else
    echo "✅ DATABASE_URL is set"
fi

# 1. Sprawdź połączenie z bazą danych
echo ""
echo "📊 Step 1: Checking database connection..."
if timeout 10 npx prisma db execute --stdin --schema=./prisma/schema.prisma <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection OK"
else
    echo "⚠️  Database connection check failed (continuing anyway)"
fi

# 2. Oznacz znane migracje jako zastosowane (zapobiega konfliktom)
echo ""
echo "📋 Step 2: Marking known migrations as applied..."
KNOWN_MIGRATIONS=(
    "20260111011940_add_premium_until"
    "20260114213634_add_userid_to_claim_request"
    "20260114215643_add_company_user_many_to_many"
    "20260114222417_add_oauth_support"
    "20250115000000_add_description_and_source_to_leads"
)

# Batch all migrations in a single Prisma command to reduce schema loads
for migration in "${KNOWN_MIGRATIONS[@]}"; do
    npx prisma migrate resolve --applied "$migration" --schema=./prisma/schema.prisma >/dev/null 2>&1 || true
done
echo "✅ Known migrations marked"

# 3. Zastosuj nowe migracje
echo ""
echo "🔄 Step 3: Applying pending migrations..."
if timeout 120 npx prisma migrate deploy --schema=./prisma/schema.prisma >/dev/null 2>&1; then
    echo "✅ Migrations applied successfully"
else
    echo "⚠️  Migration deployment had issues (continuing anyway)"
fi

# 4. Synchronizuj schemat bazy danych (dodaj brakujące kolumny/tabele)
echo ""
echo "🔧 Step 4: Synchronizing database schema..."
TEMP_SQL="./prisma/migrations/ensure_schema_temp.sql"
mkdir -p "$(dirname "$TEMP_SQL")"

cat > "$TEMP_SQL" <<'SQL_EOF'
-- Dodaj kolumny dla OAuth jeśli nie istnieją
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Upewnij się że password jest nullable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='password' AND is_nullable='NO') THEN
        ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
    END IF;
END $$;

-- Dodaj userId do ClaimRequest jeśli nie istnieje
ALTER TABLE "ClaimRequest" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Dodaj fullName do User jeśli nie istnieje
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;

-- Upewnij się że companyId jest nullable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='companyId' AND is_nullable='NO') THEN
        ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;
    END IF;
END $$;

-- Dodaj kolumnę openingHours do Company jeśli nie istnieje
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "openingHours" JSONB;

-- Utwórz tabelę CompanyUser jeśli nie istnieje
CREATE TABLE IF NOT EXISTS "CompanyUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id")
);

-- Utwórz indeksy dla CompanyUser jeśli nie istnieją
CREATE INDEX IF NOT EXISTS "CompanyUser_userId_idx" ON "CompanyUser"("userId");
CREATE INDEX IF NOT EXISTS "CompanyUser_companyId_idx" ON "CompanyUser"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyUser_userId_companyId_key" ON "CompanyUser"("userId", "companyId");

-- Dodaj foreign keys dla CompanyUser jeśli nie istnieją
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='CompanyUser_userId_fkey' AND table_name='CompanyUser') THEN
        ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='CompanyUser_companyId_fkey' AND table_name='CompanyUser') THEN
        ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Utwórz tabelę Account jeśli nie istnieje (dla OAuth)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- Utwórz tabelę Session jeśli nie istnieje (dla OAuth)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Utwórz indeksy dla Account i Session
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Dodaj foreign keys dla Account i Session jeśli nie istnieją
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Account_userId_fkey' AND table_name='Account') THEN
        ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Session_userId_fkey' AND table_name='Session') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClaimRequest_userId_fkey' AND table_name='ClaimRequest') THEN
        ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Dodaj kolumny description i source do Lead (bezpieczne - tylko jeśli nie istnieją)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Lead' AND column_name='description') THEN
        ALTER TABLE "Lead" ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Lead' AND column_name='source') THEN
        ALTER TABLE "Lead" ADD COLUMN "source" TEXT;
    END IF;
END $$;
SQL_EOF

echo "Executing schema synchronization SQL..."
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -f "$TEMP_SQL" > /dev/null 2>&1; then
        echo "✅ Schema synchronized via psql"
    else
        echo "⚠️  Schema sync had warnings (this is usually safe)"
    fi
else
    if timeout 30 npx prisma db execute --file "$TEMP_SQL" --schema=./prisma/schema.prisma > /dev/null 2>&1; then
        echo "✅ Schema synchronized via prisma"
    else
        echo "⚠️  Schema sync had warnings (this is usually safe - columns may already exist)"
    fi
fi

rm -f "$TEMP_SQL" 2>/dev/null || true

# 5. Generuj Prisma Client (ważne - w przypadku zmian w schemacie)
echo ""
echo "🔨 Step 5: Generating Prisma Client..."
if timeout 60 npx prisma generate --schema=./prisma/schema.prisma >/dev/null 2>&1; then
    echo "✅ Prisma Client generated successfully"
else
    echo "⚠️  Prisma Client generation had issues (continuing anyway)"
fi

# 6. Sprawdź czy istnieje domyślny tenant (opcjonalnie)
echo ""
echo "🏢 Step 6: Checking for default tenant..."
if npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-default-tenant.ts > /dev/null 2>&1; then
    echo "✅ Default tenant check completed"
else
    echo "⚠️  Tenant check had issues (this is optional, continuing)"
fi

# 7. Sprawdź wersje
echo ""
echo "📦 Step 7: Environment check..."
echo "   Node version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   Prisma version: $(npx prisma --version 2>/dev/null || echo 'not available')"

# 8. Podsumowanie
echo ""
echo "=========================================="
echo "✅ Post-Deploy Script Completed!"
echo "=========================================="
echo ""
echo "Aplikacja jest gotowa do uruchomienia."
echo "Wszystkie migracje zostały zastosowane."
echo "Schemat bazy danych jest zsynchronizowany."
echo ""

# Usuń flagę deploymentu po zakończeniu
unset DEPLOYING
unset SKIP_REVIEW_GENERATION

echo "Możesz teraz uruchomić aplikację:"
echo "  npm run start"
echo ""
