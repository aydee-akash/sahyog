"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { donorDetailsSchema, paymentSchema } from "@/lib/validation";
import { chargeMock } from "@/lib/payments";
import { confirmPayment, markPaymentFailed } from "@/lib/receipts";
import { signReceiptToken } from "@/lib/session";

export type CreateResult = { ok: true; donationId: string } | { ok: false; fieldErrors?: Record<string, string>; error?: string };

export async function createDonation(input: unknown): Promise<CreateResult> {
  const parsed = donorDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, fieldErrors };
  }
  const { idempotencyKey, campaignSlug, ...d } = parsed.data;
  const campaign = await prisma.campaign.findFirst({ where: { slug: campaignSlug, active: true } });
  if (!campaign) return { ok: false, error: "यह अभियान अभी बंद है।" };
  const session = await getSession();

  // Same key = same donation (back button, double tap, flaky 3G retry).
  const donation = await prisma.donation.upsert({
    where: { idempotencyKey },
    update: {},
    create: { idempotencyKey, campaignId: campaign.id, userId: session?.role === "DONOR" ? session.userId : null, ...d },
  });
  if (donation.status === "PAID") return { ok: true, donationId: donation.id };
  if (donation.amount !== d.amount || donation.donorPan !== d.donorPan || donation.donorName !== d.donorName) {
    // Details changed after the first submit: update the still-pending donation.
    await prisma.donation.update({ where: { id: donation.id }, data: d });
  }
  return { ok: true, donationId: donation.id };
}

export type PayResult =
  | { ok: true; redirectTo: string }
  | { ok: false; code: "DECLINED" | "FOREIGN_CARD" | "INVALID" | "NOT_FOUND"; message: string };

export async function payDonation(input: unknown): Promise<PayResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID", message: "भुगतान की जानकारी अधूरी है।" };
  const donation = await prisma.donation.findUnique({ where: { id: parsed.data.donationId } });
  if (!donation) return { ok: false, code: "NOT_FOUND", message: "दान नहीं मिला। दोबारा शुरू करें।" };

  const done = async () => ({
    ok: true as const,
    redirectTo: `/donate/success/${donation.id}?t=${await signReceiptToken(donation.id)}`,
  });
  if (donation.status === "PAID") return done();

  const result = chargeMock(parsed.data);
  if (!result.ok) {
    await markPaymentFailed(donation.id, result.code);
    return { ok: false, code: result.code, message: result.message };
  }
  // In production this runs from the gateway webhook (see /api/payments/webhook);
  // confirmPayment is idempotent so both paths can safely race.
  await confirmPayment(donation.id, result.ref);
  return done();
}
