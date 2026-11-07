// Integration tests (TEST_DATABASE_URL): monthly mandates and cancellation.
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addMonth } from "@/lib/dates";
import { runDueInstalments } from "@/lib/mandates";
import { cancelReceipt, confirmPayment, NotPayableError } from "@/lib/receipts";

describe("addMonth", () => {
  it("keeps the day and clamps to month end", () => {
    expect(addMonth(new Date("2026-01-31T05:00:00Z")).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonth(new Date("2028-01-31T05:00:00Z")).toISOString().slice(0, 10)).toBe("2028-02-29");
    expect(addMonth(new Date("2026-12-15T05:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});

const url = process.env.TEST_DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

describe.skipIf(!url)("monthly mandates and cancellation", () => {
  let campaignId = "";
  beforeAll(() => {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  });
  beforeEach(async () => {
    await db.receipt.deleteMany();
    await db.donation.updateMany({ data: { parentId: null } });
    await db.donation.deleteMany();
    await db.receiptCounter.deleteMany();
    await db.campaign.deleteMany();
    campaignId = (await db.campaign.create({ data: { slug: "m", titleHi: "m", titleEn: "m", blurbHi: "m", goal: 1 } })).id;
  });
  afterAll(() => db.$disconnect());

  async function mandate(status: "ACTIVE" | "PAUSED", start: Date) {
    const d = await db.donation.create({
      data: { idempotencyKey: randomUUID(), campaignId, amount: 500, donorName: "M", donorEmail: "m@example.com", donorPan: "ABCPM1234K", donorAddress: "Bhopal", frequency: "MONTHLY" },
    });
    await confirmPayment(d.id, "first", db, start);
    return db.donation.update({ where: { id: d.id }, data: { mandateStatus: status, nextChargeAt: addMonth(start) } });
  }

  it("charges every missed month once, and running again charges nothing", async () => {
    const m = await mandate("ACTIVE", new Date("2026-06-10T05:00:00Z"));
    const now = new Date("2026-09-12T05:00:00Z"); // July, Aug, Sep due
    const first = await runDueInstalments(now, db);
    expect(first.receipts).toHaveLength(3);
    const again = await runDueInstalments(now, db);
    expect(again.receipts).toHaveLength(0);
    expect(await db.donation.count({ where: { parentId: m.id } })).toBe(3);
    expect((await db.donation.findUnique({ where: { id: m.id } }))?.nextChargeAt?.toISOString().slice(0, 10)).toBe("2026-10-10");
  });

  it("never charges a paused mandate", async () => {
    await mandate("PAUSED", new Date("2026-06-10T05:00:00Z"));
    expect((await runDueInstalments(new Date("2026-09-12T05:00:00Z"), db)).receipts).toHaveLength(0);
  });

  it("cancelling keeps the number (no reuse) and cannot be done twice", async () => {
    const d = await db.donation.create({
      data: { idempotencyKey: randomUUID(), campaignId, amount: 900, donorName: "C", donorEmail: "c@example.com", donorPan: "ABCPC1234K", donorAddress: "Bhopal" },
    });
    const r = await confirmPayment(d.id, "ref", db);
    await cancelReceipt(r.id, "Refunded to donor", "admin@demo.org", db);
    const after = await db.receipt.findUnique({ where: { id: r.id } });
    expect(after?.number).toBe(r.number);
    expect(after?.cancelledAt).not.toBeNull();
    await expect(cancelReceipt(r.id, "again", "admin@demo.org", db)).rejects.toBeInstanceOf(NotPayableError);

    const d2 = await db.donation.create({
      data: { idempotencyKey: randomUUID(), campaignId, amount: 100, donorName: "N", donorEmail: "n@example.com", donorPan: "ABCPN1234K", donorAddress: "Bhopal" },
    });
    expect((await confirmPayment(d2.id, "ref2", db)).seq).toBe(r.seq + 1);
  });
});
