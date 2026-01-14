/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- AlterTable
ALTER TABLE "ClaimRequest" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullName" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CompanyUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyUser_userId_idx" ON "CompanyUser"("userId");

-- CreateIndex
CREATE INDEX "CompanyUser_companyId_idx" ON "CompanyUser"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_userId_companyId_key" ON "CompanyUser"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
