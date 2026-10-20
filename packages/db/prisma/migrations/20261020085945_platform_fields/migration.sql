-- AlterEnum
ALTER TYPE "LedgerEventKind" ADD VALUE 'TIP';

-- AlterTable
ALTER TABLE "Circle" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "listedUsdCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;
