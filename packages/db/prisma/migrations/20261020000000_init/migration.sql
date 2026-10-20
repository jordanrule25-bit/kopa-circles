-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LENDER', 'AGENT', 'ADMIN', 'PARTNER');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('DCP', 'SACCO');

-- CreateEnum
CREATE TYPE "CircleStatus" AS ENUM ('FORMING', 'RAISING', 'REPAYING', 'COMPLETE', 'PAUSED');

-- CreateEnum
CREATE TYPE "CircleScore" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('LISTED', 'FUNDED', 'DISBURSED', 'REPAYING', 'CLOSED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('KES', 'USD');

-- CreateEnum
CREATE TYPE "LedgerEventKind" AS ENUM ('LOAN_LISTED', 'LENDER_DEPOSIT', 'LENDER_FUNDED', 'DISBURSEMENT', 'RESERVE_IN', 'REPAYMENT', 'CIRCLE_COVER', 'OVERPAYMENT', 'RESERVE_OUT', 'LENDER_PAYOUT', 'LENDER_LOSS', 'FEE_WRITE_OFF', 'RESCHEDULE', 'LOAN_CLOSED');

-- CreateEnum
CREATE TYPE "ReserveEventKind" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('MPESA_STATEMENT', 'BUREAU', 'AGENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "userId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "tipDefaultBps" INTEGER NOT NULL DEFAULT 500,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'KE',

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "userId" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "score" "CircleScore" NOT NULL DEFAULT 'B',
    "status" "CircleStatus" NOT NULL DEFAULT 'FORMING',
    "story" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "nationalIdHash" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "principalKesCents" INTEGER NOT NULL,
    "feeBps" INTEGER NOT NULL DEFAULT 700,
    "weeks" INTEGER NOT NULL DEFAULT 26,
    "status" "LoanStatus" NOT NULL DEFAULT 'LISTED',
    "disbursedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "dueOn" DATE NOT NULL,
    "amountKesCents" INTEGER NOT NULL,
    "principalKesCents" INTEGER NOT NULL,
    "paidKesCents" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "coveredByCircleKesCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LenderShare" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "loanId" TEXT,
    "circleId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "fxRateAtFunding" DECIMAL(12,6) NOT NULL,
    "repaidCents" INTEGER NOT NULL DEFAULT 0,
    "lostCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LenderShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "LedgerEventKind" NOT NULL,
    "loanId" TEXT,
    "circleId" TEXT,
    "lenderId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserve" (
    "id" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Reserve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveEvent" (
    "id" TEXT NOT NULL,
    "reserveId" INTEGER NOT NULL DEFAULT 1,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "ReserveEventKind" NOT NULL,
    "amountKesCents" INTEGER NOT NULL,
    "loanId" TEXT,
    "note" TEXT,

    CONSTRAINT "ReserveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreInput" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "source" "ScoreSource" NOT NULL,
    "weeklyInflowKesCents" INTEGER,
    "activeLoans" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_loanId_n_key" ON "Installment"("loanId", "n");

-- CreateIndex
CREATE INDEX "LedgerEvent_loanId_idx" ON "LedgerEvent"("loanId");

-- CreateIndex
CREATE INDEX "LedgerEvent_circleId_idx" ON "LedgerEvent"("circleId");

-- CreateIndex
CREATE INDEX "LedgerEvent_lenderId_idx" ON "LedgerEvent"("lenderId");

-- AddForeignKey
ALTER TABLE "Lender" ADD CONSTRAINT "Lender_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderShare" ADD CONSTRAINT "LenderShare_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderShare" ADD CONSTRAINT "LenderShare_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderShare" ADD CONSTRAINT "LenderShare_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReserveEvent" ADD CONSTRAINT "ReserveEvent_reserveId_fkey" FOREIGN KEY ("reserveId") REFERENCES "Reserve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreInput" ADD CONSTRAINT "ScoreInput_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

