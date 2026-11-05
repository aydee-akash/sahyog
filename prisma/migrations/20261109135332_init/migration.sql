-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DONOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ONE_TIME', 'MONTHLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DONOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "districts" TEXT[],
    "titleHi" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "summaryHi" TEXT NOT NULL DEFAULT '',
    "benefitHi" TEXT NOT NULL DEFAULT '',
    "eligibilityHi" TEXT NOT NULL DEFAULT '',
    "documentsHi" TEXT[],
    "howToApplyHi" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL,
    "noticeText" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL,
    "status" "SchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpCentre" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "HelpCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "blurbHi" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT NOT NULL,
    "donorPan" TEXT NOT NULL,
    "donorAddress" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL DEFAULT 'ONE_TIME',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "fy" TEXT NOT NULL,
    "lastNo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("fy")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "donationId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallbackRequest" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "schemeCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_code_key" ON "Scheme"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_idempotencyKey_key" ON "Donation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Donation_campaignId_status_idx" ON "Donation"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_donationId_key" ON "Receipt"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_fy_seq_key" ON "Receipt"("fy", "seq");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
