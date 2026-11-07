import { Prisma, PrismaClient, Receipt } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { financialYear, formatReceiptNo } from "./fy";
import { TRUST } from "./trust";

export class NotPayableError extends Error {}

/**
 * Marks a donation as paid and issues its 80G receipt number, atomically.
 *
 * - Idempotent: a repeated call (double click, webhook retry) returns the
 *   receipt already issued instead of issuing a second one.
 * - Gapless: the per-FY counter row is incremented inside the same
 *   transaction, so a number is only consumed when the receipt row commits.
 *   Concurrent confirmations serialise on that one row lock (cheap: campaign
 *   peaks are tens per second, not thousands).
 */
export async function confirmPayment(
  donationId: string,
  paymentRef: string,
  db: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<Receipt> {
  return db.$transaction(
    async (tx) => {
      const updated = await tx.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: { status: "PAID", paymentRef, failureReason: null },
      });
      if (updated.count === 0) {
        const existing = await tx.receipt.findUnique({ where: { donationId } });
        if (existing) return existing;
        throw new NotPayableError(`Donation ${donationId} is not pending`);
      }

      const fy = financialYear(now);
      const rows = await tx.$queryRaw<{ lastNo: number }[]>(Prisma.sql`
        INSERT INTO "ReceiptCounter" ("fy", "lastNo") VALUES (${fy}, 1)
        ON CONFLICT ("fy") DO UPDATE SET "lastNo" = "ReceiptCounter"."lastNo" + 1
        RETURNING "lastNo"`);
      const seq = rows[0].lastNo;

      return tx.receipt.create({
        data: { number: formatReceiptNo(TRUST.receiptPrefix, fy, seq), fy, seq, donationId, issuedAt: now },
      });
    },
    { maxWait: 15_000, timeout: 15_000 },
  );
}

export async function markPaymentFailed(donationId: string, reason: string, db: PrismaClient = defaultPrisma) {
  await db.donation.updateMany({
    where: { id: donationId, status: "PENDING" },
    data: { failureReason: reason },
  });
}

/**
 * Cancels a receipt (e.g. refund or bounced mandate). The number is kept and
 * never reused, so the series stays gapless for auditors; the PDF is stamped
 * CANCELLED and Form 10BD leaves it out.
 */
export async function cancelReceipt(receiptId: string, reason: string, actor: string, db: PrismaClient = defaultPrisma) {
  const r = await db.receipt.updateMany({
    where: { id: receiptId, cancelledAt: null },
    data: { cancelledAt: new Date(), cancelReason: reason, cancelledBy: actor },
  });
  if (r.count === 0) throw new NotPayableError("Receipt not found or already cancelled");
}
