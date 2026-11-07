import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { TRUST } from "./trust";
import { rupeesInWords } from "./money";

export type ReceiptPdfInput = {
  receiptNo: string;
  issuedAt: Date;
  donorName: string;
  donorPan: string;
  donorAddress: string;
  amount: number;
  paymentRef: string;
  mode: string;
  campaign: string;
  cancelled?: { at: Date; reason: string };
};

const INK = rgb(0.12, 0.13, 0.15);
const MUTED = rgb(0.4, 0.4, 0.42);
const ACCENT = rgb(0.54, 0.23, 0.07);

// Combined donation receipt and 80G certificate. English only in this phase:
// pdf-lib cannot shape Devanagari conjuncts (see TDD, "What we cut").
export async function buildReceiptPdf(r: ReceiptPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`80G Receipt ${r.receiptNo}`);
  doc.setAuthor(TRUST.nameEn);
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const left = 56;
  let y = 780;

  const text = (s: string, x: number, size = 11, f = font, color = INK) => page.drawText(s, { x, y, size, font: f, color });

  text(TRUST.nameEn, left, 18, bold, ACCENT);
  y -= 18;
  text(TRUST.city, left, 10, font, MUTED);
  y -= 14;
  text(`PAN: ${TRUST.pan}    80G Registration No: ${TRUST.reg80G}`, left, 10, font, MUTED);
  y -= 30;
  page.drawLine({ start: { x: left, y: y + 12 }, end: { x: 539, y: y + 12 }, thickness: 1, color: ACCENT });
  text("Donation Receipt and Certificate under Section 80G", left, 14, bold);
  y -= 32;

  const rows: [string, string][] = [
    ["Receipt No.", r.receiptNo],
    ["Date", r.issuedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })],
    ["Received from", r.donorName],
    ["Donor PAN", r.donorPan],
    ["Address", r.donorAddress],
    ["Amount", `Rs. ${r.amount.toLocaleString("en-IN")}/-`],
    ["Amount in words", rupeesInWords(r.amount)],
    ["Mode of payment", `${r.mode} (Ref: ${r.paymentRef})`],
    ["Towards", r.campaign],
  ];
  for (const [label, value] of rows) {
    text(label, left, 11, font, MUTED);
    // wrap long values at ~60 chars
    const lines = value.match(/.{1,60}(\s|$)/g) ?? [value];
    for (const line of lines) {
      text(line.trim(), left + 140, 11, label === "Amount" ? bold : font);
      y -= 18;
    }
    y -= 4;
  }

  y -= 16;
  const note = [
    "This donation is eligible for deduction under Section 80G of the Income-tax Act, 1961,",
    "subject to the conditions in that section. The trust will report this donation in",
    "Form 10BD, and the donor can download Form 10BE from the trust after filing.",
    "This is a computer-generated receipt and does not need a signature.",
  ];
  for (const line of note) {
    text(line, left, 9.5, font, MUTED);
    y -= 14;
  }
  y -= 20;
  text("TEST MODE - no real money was received.", left, 9, bold, ACCENT);

  if (r.cancelled) {
    page.drawText("CANCELLED", { x: 120, y: 360, size: 84, font: bold, color: rgb(0.65, 0.15, 0.11), opacity: 0.18, rotate: degrees(30) });
    y -= 22;
    text(`Cancelled on ${r.cancelled.at.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}: ${r.cancelled.reason}`.slice(0, 95), left, 10, bold, rgb(0.65, 0.15, 0.11));
    y -= 14;
    text("This receipt is void and not valid for 80G deduction.", left, 9.5, font, rgb(0.65, 0.15, 0.11));
  }

  return doc.save();
}
