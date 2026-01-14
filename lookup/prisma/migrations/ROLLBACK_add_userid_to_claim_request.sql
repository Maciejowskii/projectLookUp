-- ROLLBACK MIGRATION
-- This reverses the changes from: 20260114213634_add_userid_to_claim_request
-- 
-- WARNING: This will delete the CompanyUser table and all its data!
-- Make sure to backup your database first.

-- Step 1: Drop CompanyUser table and all its constraints
DROP TABLE IF EXISTS "CompanyUser" CASCADE;

-- Step 2: Remove userId column from ClaimRequest
ALTER TABLE "ClaimRequest" DROP COLUMN IF EXISTS "userId";

-- Step 3: Remove fullName column from User (optional - keep if you use it)
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "fullName";

-- Step 4: Handle NULL companyId values before making it NOT NULL
-- IMPORTANT: Update this query to assign valid companyIds to users with NULL
-- Example: UPDATE "User" SET "companyId" = (SELECT id FROM "Company" LIMIT 1) WHERE "companyId" IS NULL;

-- Step 5: Make companyId NOT NULL again
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;

-- Step 6: Restore original foreign key constraint (NOT NULL, RESTRICT on delete)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" 
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Note: Stripe fields (stripeCustomerId, stripeSubscriptionId) are kept
-- Remove them if you don't need them:
-- ALTER TABLE "Company" DROP COLUMN IF EXISTS "stripeCustomerId";
-- ALTER TABLE "Company" DROP COLUMN IF EXISTS "stripeSubscriptionId";
-- DROP INDEX IF EXISTS "Company_stripeCustomerId_key";
-- DROP INDEX IF EXISTS "Company_stripeSubscriptionId_key";
