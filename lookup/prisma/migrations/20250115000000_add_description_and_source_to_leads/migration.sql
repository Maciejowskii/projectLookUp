-- AlterTable - Dodaj kolumny description i source do tabeli Lead
-- Te kolumny są nullable, więc istniejące rekordy nie są naruszone
ALTER TABLE "Lead" ADD COLUMN "description" TEXT;
ALTER TABLE "Lead" ADD COLUMN "source" TEXT;
