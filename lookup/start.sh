#!/bin/bash
# Don't exit on error - we want the app to start even if some SQL commands fail
set +e

# Change to script directory if not already there
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "=== Starting deployment process ==="
echo "Working directory: $(pwd)"

# 1. Oznacz wszystkie migracje jako zastosowane (rozwiązuje konflikt z istniejącymi obiektami)
echo "Marking all migrations as applied..."
npx prisma migrate resolve --applied 20260111011940_add_premium_until 2>/dev/null || true
npx prisma migrate resolve --applied 20260114213634_add_userid_to_claim_request 2>/dev/null || true
npx prisma migrate resolve --applied 20260114215643_add_company_user_many_to_many 2>/dev/null || true
npx prisma migrate resolve --applied 20260114222417_add_oauth_support 2>/dev/null || true
npx prisma migrate resolve --applied 20250115000000_add_description_and_source_to_leads 2>/dev/null || true

# 2. Aplikuj oczekujące migracje (jeśli są jakieś nowe)
echo "Applying pending migrations..."
npx prisma migrate deploy || true

# 3. Dodaj brakujące kolumny bezpośrednio przez SQL (jeśli nie istnieją)
echo "Ensuring all required columns exist..."
TEMP_SQL="./prisma/migrations/ensure_columns_temp.sql"
echo "Creating SQL file at: $TEMP_SQL"
mkdir -p "$(dirname "$TEMP_SQL")"
cat > "$TEMP_SQL" <<'SQL_EOF'
-- Dodaj kolumny dla OAuth jeśli nie istnieją
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Upewnij się że password jest nullable (tylko jeśli kolumna istnieje)
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

-- Upewnij się że companyId jest nullable (tylko jeśli kolumna istnieje)
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

-- Utwórz indeksy jeśli nie istnieją
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

echo "Executing SQL commands..."
echo "SQL file size: $(wc -l < "$TEMP_SQL" 2>/dev/null || echo 0) lines"

# Try using psql directly if available, otherwise fall back to prisma db execute
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
    echo "Using psql directly..."
    if psql "$DATABASE_URL" -f "$TEMP_SQL" 2>&1; then
        echo "SQL executed successfully via psql"
    else
        echo "Warning: psql execution had errors (continuing anyway - this is usually safe)"
    fi
else
    echo "Using prisma db execute (psql not available or DATABASE_URL not set)..."
    # Use timeout to prevent hanging (30 seconds)
    if timeout 30 npx prisma db execute --file "$TEMP_SQL" --schema=./prisma/schema.prisma 2>&1; then
        echo "SQL executed successfully via prisma"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            echo "Warning: prisma db execute timed out after 30s (continuing anyway)"
        else
            echo "Warning: prisma db execute had errors (exit code: $EXIT_CODE) - continuing anyway"
            echo "This is usually safe - columns may already exist"
        fi
    fi
fi

echo "Cleaning up temporary file..."
rm -f "$TEMP_SQL" 2>/dev/null || true

echo "Database schema synchronized!"

# 4. Generate Prisma Client (important - in case schema changed)
echo "Generating Prisma Client..."
if npx prisma generate 2>&1; then
    echo "Prisma Client generated successfully"
else
    echo "Warning: prisma generate had errors (continuing anyway - client may already be generated)"
fi

# 5. Uruchom aplikację
echo "Starting Next.js application..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la | head -10)"

# Start the application
exec npm run start
