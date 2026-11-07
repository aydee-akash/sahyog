// Campaign-day load test for the receipt engine (the brief's "hard part").
// Simulates N donations confirmed at a given concurrency against a DISPOSABLE
// database, then checks every receipt number is unique and gapless.
//
//   TEST_DATABASE_URL=... npx tsx scripts/load-test.ts 5000 50
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { confirmPayment } from "../src/lib/receipts";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable database");
const total = Number(process.argv[2] ?? 5000);
const concurrency = Number(process.argv[3] ?? 50);
const db = new PrismaClient({ datasources: { db: { url: `${url}${url.includes("?") ? "&" : "?"}connection_limit=${concurrency}` } } });

async function main() {
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  await db.receipt.deleteMany();
  await db.donation.updateMany({ data: { parentId: null } });
  await db.donation.deleteMany();
  await db.receiptCounter.deleteMany();
  await db.campaign.deleteMany();
  const campaign = await db.campaign.create({ data: { slug: "load", titleHi: "load", titleEn: "load", blurbHi: "load", goal: 1 } });

  const ids: string[] = [];
  for (let i = 0; i < total; i += 1000) {
    const batch = Array.from({ length: Math.min(1000, total - i) }, () => ({
      id: randomUUID(),
      idempotencyKey: randomUUID(),
      campaignId: campaign.id,
      amount: 1000,
      donorName: "Load Test",
      donorEmail: "load@example.com",
      donorPan: "ABCPL1234K",
      donorAddress: "Bhopal",
    }));
    await db.donation.createMany({ data: batch });
    ids.push(...batch.map((b) => b.id));
  }

  const latencies: number[] = [];
  let next = 0;
  const started = Date.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const t = performance.now();
        await confirmPayment(id, `load_${id.slice(0, 8)}`, db);
        latencies.push(performance.now() - t);
      }
    }),
  );
  const secs = (Date.now() - started) / 1000;

  const seqs = (await db.receipt.findMany({ select: { seq: true }, orderBy: { seq: "asc" } })).map((r) => r.seq);
  const gapless = seqs.length === total && seqs.every((s, i) => s === i + 1);
  latencies.sort((a, b) => a - b);
  const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))].toFixed(1);

  console.log(`donations: ${total}, concurrency: ${concurrency}`);
  console.log(`time: ${secs.toFixed(2)} s → ${(total / secs).toFixed(0)} receipts/s`);
  console.log(`latency ms: p50 ${pct(50)}, p95 ${pct(95)}, p99 ${pct(99)}`);
  console.log(`receipts: ${seqs.length}, unique & gapless 1..${total}: ${gapless ? "YES" : "NO"}`);
  console.log(`brief's peak: 5,000 in "a few hours" ≈ 0.5–1.5 per second`);
  if (!gapless) process.exitCode = 1;
}

main().finally(() => db.$disconnect());
