import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Form 10BD statement of donations, one row per donor PAN per FY.
// ASSUMPTION: column set follows the 10BD bulk-upload template in spirit;
// exact headers must be checked against the current Income Tax portal CSV.
const csvCell = (v: string | number) => {
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote every cell.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const fy = req.nextUrl.searchParams.get("fy") ?? "";
  if (!/^\d{4}-\d{2}$/.test(fy)) return NextResponse.json({ error: "fy must look like 2026-27" }, { status: 400 });

  const receipts = await prisma.receipt.findMany({ where: { fy, cancelledAt: null }, include: { donation: true }, orderBy: { seq: "asc" } });
  const byPan = new Map<string, { name: string; address: string; amount: number; receipts: string[] }>();
  for (const r of receipts) {
    const d = r.donation;
    const row = byPan.get(d.donorPan) ?? { name: d.donorName, address: d.donorAddress, amount: 0, receipts: [] };
    row.amount += d.amount;
    row.receipts.push(r.number);
    byPan.set(d.donorPan, row);
  }
  const header = ["Sl No", "ID Code", "Unique Identification Number", "Name of donor", "Address of donor", "Donation Type", "Mode of receipt", "Amount of donation (INR)", "Receipt numbers"];
  const lines = [header.map(csvCell).join(",")];
  let i = 1;
  for (const [pan, r] of byPan) {
    lines.push([i++, "Permanent Account Number", pan, r.name, r.address, "Others", "Electronic modes", r.amount, r.receipts.join(" ")].map(csvCell).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="form10bd-${fy}.csv"` },
  });
}
