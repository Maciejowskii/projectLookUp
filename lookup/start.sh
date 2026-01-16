#!/bin/bash
set -e

echo "=== Starting deployment process ==="

# 1. Oznacz wszystkie migracje jako zastosowane (rozwiązuje konflikt z istniejącymi obiektami)
echo "Marking all migrations as applied..."
npx prisma migrate resolve --applied 20260111011940_add_premium_until 2>/dev/null || true
npx prisma migrate resolve --applied 20260114213634_add_userid_to_claim_request 2>/dev/null || true
npx prisma migrate resolve --applied 20260114215643_add_company_user_many_to_many 2>/dev/null || true
npx prisma migrate resolve --applied 20260114222417_add_oauth_support 2>/dev/null || true

# 2. Aplikuj oczekujące migracje (jeśli są jakieś nowe)
echo "Applying pending migrations..."
npx prisma migrate deploy || true

# 3. Dodaj brakujące kolumny bezpośrednio przez SQL (jeśli nie istnieją)
echo "Ensuring all required columns exist..."
npx prisma db execute --stdin <<EOF
-- Dodaj kolumny dla OAuth jeśli nie istnieją
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Upewnij się że password jest nullable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Dodaj userId do ClaimRequest jeśli nie istnieje
ALTER TABLE "ClaimRequest" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Dodaj fullName do User jeśli nie istnieje
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;

-- Upewnij się że companyId jest nullable
ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;

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
EOF

echo "Database schema synchronized!"

# 4. Uruchom aplikację
echo "Starting Next.js application..."
exec npm run start
