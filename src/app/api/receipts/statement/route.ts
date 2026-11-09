import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildStatementPdf } from "@/lib/pdf";

// GET /api/receipts/statement?fy=2026-27 → the logged-in donor's yearly statement.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const fy = req.nextUrl.searchParams.get("fy") ?? "";
  if (!/^\d{4}-\d{2}$/.test(fy)) return NextResponse.json({ error: "fy must look like 2026-27" }, { status: 400 });

  const receipts = await prisma.receipt.findMany({
    where: { fy, cancelledAt: null, donation: { userId: session.userId } },
    include: { donation: { include: { campaign: true } } },
    orderBy: { seq: "asc" },
  });
  if (receipts.length === 0) return NextResponse.json({ error: "No receipts for this year" }, { status: 404 });

  const pdf = await buildStatementPdf({
    donorName: receipts[0].donation.donorName,
    fy,
    rows: receipts.map((r) => ({
      receiptNo: r.number,
      date: r.issuedAt,
      campaign: r.donation.campaign.titleEn,
      amount: r.donation.amount,
      pan: r.donation.donorPan,
    })),
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="sahyog-statement-${fy}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
