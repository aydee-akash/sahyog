-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CallbackRequest" ADD COLUMN     "handled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "handledAt" TIMESTAMP(3),
ADD COLUMN     "handledBy" TEXT,
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "blurbEn" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "mandateStatus" "MandateStatus",
ADD COLUMN     "nextChargeAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT;

-- AlterTable
ALTER TABLE "Scheme" ADD COLUMN     "benefitEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "documentsEn" TEXT[],
ADD COLUMN     "eligibilityEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "howToApplyEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "summaryEn" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinderUse" (
    "id" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "matches" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinderUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Outbox_createdAt_idx" ON "Outbox"("createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_email_idx" ON "OtpCode"("email");

-- CreateIndex
CREATE INDEX "FinderUse_createdAt_idx" ON "FinderUse"("createdAt");

-- CreateIndex
CREATE INDEX "Donation_donorEmail_idx" ON "Donation"("donorEmail");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
