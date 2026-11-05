// Integration test against a real Postgres (TEST_DATABASE_URL). Proves the
// "hard part": under concurrent confirmations every paid donation gets exactly
// one receipt and numbers are unique and gapless within the financial year.
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { confirmPayment, NotPayableError } from "@/lib/receipts";

const url = process.env.TEST_DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

async function newDonation(campaignId: string) {
  return db.donation.create({
    data: {
      idempotencyKey: randomUUID(),
      campaignId,
      amount: 1000,
      donorName: "Test Donor",
      donorEmail: "t@example.com",
      donorPan: "ABCPT1234K",
      donorAddress: "Bhopal",
    },
  });
}

describe.skipIf(!url)("receipt numbering", () => {
  let campaignId = "";

  beforeAll(() => {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  });
  beforeEach(async () => {
    await db.receipt.deleteMany();
    await db.donation.deleteMany();
    await db.receiptCounter.deleteMany();
    await db.campaign.deleteMany();
    campaignId = (await db.campaign.create({ data: { slug: "t", titleHi: "t", titleEn: "t", blurbHi: "t", goal: 1 } })).id;
  });
  afterAll(() => db.$disconnect());

  it("issues unique, gapless numbers under 200 concurrent confirmations", async () => {
    const donations = await Promise.all(Array.from({ length: 200 }, () => newDonation(campaignId)));
    const receipts = await Promise.all(donations.map((d) => confirmPayment(d.id, "ref", db)));
    const seqs = receipts.map((r) => r.seq).sort((a, b) => a - b);
    expect(new Set(receipts.map((r) => r.number)).size).toBe(200);
    expect(seqs).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
  });

  it("is idempotent: a replayed confirmation returns the same receipt", async () => {
    const d = await newDonation(campaignId);
    const [a, b, c] = await Promise.all([confirmPayment(d.id, "r1", db), confirmPayment(d.id, "r1", db), confirmPayment(d.id, "r1", db)]);
    expect(a.id).toBe(b.id);
    expect(b.id).toBe(c.id);
    expect(await db.receipt.count()).toBe(1);
    expect((await db.receiptCounter.findFirst())?.lastNo).toBe(1);
  });

  it("restarts numbering in a new financial year", async () => {
    const d1 = await newDonation(campaignId);
    const d2 = await newDonation(campaignId);
    const r1 = await confirmPayment(d1.id, "r", db, new Date("2027-03-31T10:00:00Z"));
    const r2 = await confirmPayment(d2.id, "r", db, new Date("2027-04-02T10:00:00Z"));
    expect(r1.number).toMatch(/2026-27\/000001$/);
    expect(r2.number).toMatch(/2027-28\/000001$/);
  });

  it("refuses to receipt a failed donation", async () => {
    const d = await newDonation(campaignId);
    await db.donation.update({ where: { id: d.id }, data: { status: "FAILED" } });
    await expect(confirmPayment(d.id, "r", db)).rejects.toBeInstanceOf(NotPayableError);
  });
});
