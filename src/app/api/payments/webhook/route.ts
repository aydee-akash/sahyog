import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmPayment, markPaymentFailed, NotPayableError } from "@/lib/receipts";
import { afterPaid } from "@/lib/afterPaid";

// Gateway → us. Signed with PAYMENT_WEBHOOK_SECRET (HMAC-SHA256 of the raw body).
// Safe to retry: confirmPayment is idempotent per donation.
const eventSchema = z.object({
  type: z.enum(["payment.captured", "payment.failed"]),
  donationId: z.string().min(1),
  paymentRef: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await req.text();
  const given = Buffer.from(req.headers.get("x-signature") ?? "", "hex");
  const expected = createHmac("sha256", secret).update(raw).digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  const parsed = eventSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  const e = parsed.data;
  try {
    if (e.type === "payment.captured") {
      const receipt = await confirmPayment(e.donationId, e.paymentRef);
      await afterPaid(e.donationId);
      return NextResponse.json({ receipt: receipt.number });
    }
    await markPaymentFailed(e.donationId, e.reason ?? "FAILED");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotPayableError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
