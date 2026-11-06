import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildReceiptPdf } from "@/lib/pdf";
import { canViewReceipt } from "@/lib/receiptAccess";

// GET /api/receipts/:donationId?t=token → 80G receipt PDF, rendered from the
// stored receipt row so it is identical every time it is downloaded.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donation = await prisma.donation.findUnique({ where: { id }, include: { receipt: true, campaign: true } });
  if (!donation?.receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canViewReceipt(donation, req.nextUrl.searchParams.get("t")))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pdf = await buildReceiptPdf({
    receiptNo: donation.receipt.number,
    issuedAt: donation.receipt.issuedAt,
    donorName: donation.donorName,
    donorPan: donation.donorPan,
    donorAddress: donation.donorAddress,
    amount: donation.amount,
    paymentRef: donation.paymentRef ?? "-",
    mode: donation.frequency === "MONTHLY" ? "Online (monthly mandate)" : "Online",
    campaign: donation.campaign.titleEn,
  });
  const filename = `80G-${donation.receipt.number.replaceAll("/", "-")}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
