import { prisma } from "./db";
import { sendMock } from "./outbox";
import { signReceiptToken } from "./session";
import { addMonth } from "./dates";
import { formatINR } from "./money";

/**
 * Follow-ups after a payment is confirmed: start the monthly mandate and send
 * the receipt email. Safe to call more than once (webhook and redirect can race).
 */
export async function afterPaid(donationId: string) {
  const d = await prisma.donation.findUnique({ where: { id: donationId }, include: { receipt: true, campaign: true } });
  if (!d?.receipt) return;
  if (d.frequency === "MONTHLY" && !d.parentId) {
    await prisma.donation.updateMany({
      where: { id: d.id, mandateStatus: null },
      data: { mandateStatus: "ACTIVE", nextChargeAt: addMonth(d.receipt.issuedAt) },
    });
  }
  const base = process.env.APP_URL ?? "";
  const link = `${base}/api/receipts/${d.id}?t=${await signReceiptToken(d.id)}`;
  await sendMock({
    to: d.donorEmail,
    dedupeKey: `receipt:${d.receipt.number}`,
    subject: `रसीद ${d.receipt.number}: ${formatINR(d.amount)} के दान के लिए धन्यवाद`,
    body: `प्रिय ${d.donorName},\n\n“${d.campaign.titleHi}” के लिए आपके ${formatINR(d.amount)} के दान के लिए धन्यवाद।\nरसीद और 80G प्रमाण पत्र: ${link}\n\n${d.frequency === "MONTHLY" ? "आपका मासिक दान चालू है; खाते से कभी भी रोक सकते हैं।\n" : ""}`,
  });
}
