"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendMock } from "@/lib/outbox";

const schema = z.object({ donationId: z.string().min(1), action: z.enum(["PAUSE", "RESUME", "CANCEL"]) });

const NEXT: Record<string, { from: ("ACTIVE" | "PAUSED")[]; to: "ACTIVE" | "PAUSED" | "CANCELLED" }> = {
  PAUSE: { from: ["ACTIVE"], to: "PAUSED" },
  RESUME: { from: ["PAUSED"], to: "ACTIVE" },
  CANCEL: { from: ["ACTIVE", "PAUSED"], to: "CANCELLED" },
};

export async function manageMandate(form: FormData) {
  const session = await requireUser("/account");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { donationId, action } = parsed.data;
  const rule = NEXT[action];
  // Ownership is part of the WHERE clause: donors can only change their own mandates.
  const updated = await prisma.donation.updateMany({
    where: { id: donationId, userId: session.userId, frequency: "MONTHLY", parentId: null, mandateStatus: { in: rule.from } },
    data: { mandateStatus: rule.to },
  });
  if (updated.count) {
    await prisma.auditLog.create({ data: { actor: session.email, action: `mandate:${action}`, entity: "Donation", entityId: donationId } });
    await sendMock({
      to: session.email,
      subject: `मासिक दान: ${rule.to === "ACTIVE" ? "फिर शुरू" : rule.to === "PAUSED" ? "रोका गया" : "बंद किया गया"}`,
      body: `Your monthly donation ${donationId} is now ${rule.to}.`,
    });
  }
  revalidatePath("/account");
}
