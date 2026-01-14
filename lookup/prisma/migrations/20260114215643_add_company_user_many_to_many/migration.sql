/*
  Warnings:

  - You are about to drop the column `userId` on the `ClaimRequest` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClaimRequest" DROP CONSTRAINT "ClaimRequest_userId_fkey";

-- AlterTable
ALTER TABLE "ClaimRequest" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "fullName";
