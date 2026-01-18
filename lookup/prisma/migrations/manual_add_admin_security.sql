-- Migracja: Dodanie bezpieczeństwa panelu admina
-- Uruchom ręcznie: psql -d catalogs_mvp -f manual_add_admin_security.sql
-- Lub przez Docker: docker exec -i db psql -U postgres -d catalogs_mvp < manual_add_admin_security.sql

-- 1. Dodaj enum UserRole
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END$$;

-- 2. Dodaj kolumnę role do User (jeśli nie istnieje)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role') THEN
        ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
    END IF;
END$$;

-- 3. Utwórz tabelę AdminSession
CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- 4. Utwórz tabelę AdminAuditLog
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- 5. Dodaj unikalne indeksy dla AdminSession
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminSession_token_key') THEN
        CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");
    END IF;
END$$;

-- 6. Dodaj indeksy
CREATE INDEX IF NOT EXISTS "AdminSession_userId_idx" ON "AdminSession"("userId");
CREATE INDEX IF NOT EXISTS "AdminSession_token_idx" ON "AdminSession"("token");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- 7. Dodaj foreign keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AdminSession_userId_fkey') THEN
        ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AdminAuditLog_userId_fkey') THEN
        ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- 8. Zaktualizuj _prisma_migrations
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid()::text, 'manual_admin_security', NOW(), 'manual_add_admin_security', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;

-- GOTOWE!
SELECT 'Migracja zakończona pomyślnie!' AS status;
