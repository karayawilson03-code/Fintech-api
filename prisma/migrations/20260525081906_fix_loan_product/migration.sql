/*
  Warnings:

  - You are about to drop the column `loanProductId` on the `Loan` table. All the data in the column will be lost.
  - Added the required column `loanProduct` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_loanProductId_fkey";

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "loanProductId",
ADD COLUMN     "loanProduct" TEXT NOT NULL;
