import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { confirmPayment } from "./receipts";
import { addMonth } from "./dates";

export { addMonth };

/**
 * Charges every ACTIVE monthly mandate that is due (test mode) and issues a
 * receipt per instalment. Idempotent: the instalment's idempotency key is
 * "<mandate id>:<due date>", so running it twice never double-charges.
 */
export async function runDueInstalments(now = new Date(), db: PrismaClient = defaultPrisma) {
  const due = await db.donation.findMany({
    where: { frequency: "MONTHLY", parentId: null, mandateStatus: "ACTIVE", status: "PAID", nextChargeAt: { lte: now } },
  });
  const issued: { donationId: string; number: string }[] = [];
  for (const m of due) {
    let next = m.nextChargeAt!;
    while (next <= now) {
      const key = `${m.id}:${next.toISOString().slice(0, 10)}`;
      const inst = await db.donation.upsert({
        where: { idempotencyKey: key },
        update: {},
        create: {
          idempotencyKey: key,
          parentId: m.id,
          userId: m.userId,
          campaignId: m.campaignId,
          amount: m.amount,
          donorName: m.donorName,
          donorEmail: m.donorEmail,
          donorPan: m.donorPan,
          donorAddress: m.donorAddress,
          frequency: "MONTHLY",
          createdAt: next,
        },
      });
      const r = await confirmPayment(inst.id, `test_mandate_${inst.id.slice(-8)}`, db, next);
      issued.push({ donationId: inst.id, number: r.number });
      next = addMonth(next);
    }
    await db.donation.update({ where: { id: m.id }, data: { nextChargeAt: next } });
  }
  return { mandates: due.length, receipts: issued };
}
