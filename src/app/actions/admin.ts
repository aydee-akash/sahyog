"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SchemeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { DICTS } from "@/lib/i18n";
import { draftHindiSummary, DraftResult } from "@/lib/ai";
import { canTransition, missingForReview } from "@/lib/workflow";
import { DISTRICTS, NEEDS } from "@/lib/content";
import { cancelReceipt, NotPayableError } from "@/lib/receipts";
import { runDueInstalments } from "@/lib/mandates";
import { afterPaid } from "@/lib/afterPaid";

const needKeys = NEEDS.map((n) => n.key) as [string, ...string[]];
const districtKeys = DISTRICTS.map((d) => d.key) as [string, ...string[]];

const rulesSchema = z.object({
  minAge: z.number().int().min(0).max(120).optional(),
  maxAge: z.number().int().min(0).max(120).optional(),
  marital: z.array(z.enum(["MARRIED", "WIDOW", "UNMARRIED", "SEPARATED"])).optional(),
  bpl: z.boolean().optional(),
  shg: z.boolean().optional(),
  pregnancy: z.array(z.enum(["FIRST", "LATER"])).optional(),
});

const contentSchema = z.object({
  titleHi: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  need: z.enum(needKeys),
  districts: z.array(z.enum(districtKeys)),
  summaryHi: z.string().trim().max(600),
  benefitHi: z.string().trim().max(300),
  eligibilityHi: z.string().trim().max(500),
  documentsHi: z.array(z.string().trim().min(1).max(120)).max(12),
  howToApplyHi: z.string().trim().max(800),
  summaryEn: z.string().trim().max(600),
  benefitEn: z.string().trim().max(300),
  eligibilityEn: z.string().trim().max(500),
  documentsEn: z.array(z.string().trim().min(1).max(120)).max(12),
  howToApplyEn: z.string().trim().max(800),
  sourceUrl: z.string().trim().url(),
  noticeText: z.string().trim().min(20).max(10_000),
  lastChecked: z.coerce.date(),
  rules: rulesSchema,
  aiDrafted: z.boolean(),
});

async function adminText() {
  const lang = await getLang();
  return { lang, ...DICTS[lang].admin };
}

async function audit(actor: string, action: string, entityId: string, detail = "") {
  await prisma.auditLog.create({ data: { actor, action, entity: "Scheme", entityId, detail } });
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveScheme(id: string, input: unknown): Promise<SaveResult> {
  const admin = await requireAdmin();
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(".")}: ${i.message}` };
  }
  const existing = await prisma.scheme.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: (await adminText()).err.schemeNotFound };
  // Any edit sends the scheme back to draft so it is reviewed again.
  await prisma.scheme.update({
    where: { id },
    data: { ...parsed.data, status: "DRAFT", reviewedBy: null },
  });
  await audit(admin.email, existing.status === "PUBLISHED" ? "edit_unpublished" : "save", id);
  revalidatePath(`/admin/schemes/${id}`);
  revalidatePath("/");
  revalidatePath(`/schemes/${existing.code}`);
  return { ok: true };
}

export async function generateDraft(id: string): Promise<DraftResult> {
  const admin = await requireAdmin();
  const { lang, err } = await adminText();
  const s = await prisma.scheme.findUnique({ where: { id } });
  if (!s) return { ok: false, error: err.schemeNotFound };
  const res = await draftHindiSummary(s.titleEn, s.noticeText, lang);
  await audit(admin.email, res.ok ? "ai_draft" : "ai_draft_failed", id, res.ok ? "" : res.error);
  return res;
}

export async function transitionScheme(id: string, to: SchemeStatus): Promise<SaveResult> {
  const admin = await requireAdmin();
  const { err, missing: fieldLabel } = await adminText();
  const s = await prisma.scheme.findUnique({ where: { id } });
  if (!s) return { ok: false, error: err.schemeNotFound };
  if (!canTransition(s.status, to)) return { ok: false, error: err.badTransition };
  if (to === "IN_REVIEW") {
    const missing = missingForReview(s);
    if (missing.length) return { ok: false, error: err.fillFirst(missing.map((m) => fieldLabel[m]).join(", ")) };
  }
  await prisma.scheme.update({
    where: { id },
    data: { status: to, reviewedBy: to === "PUBLISHED" ? admin.email : null },
  });
  await audit(admin.email, `status:${s.status}->${to}`, id);
  revalidatePath(`/admin/schemes/${id}`);
  revalidatePath("/");
  revalidatePath(`/schemes/${s.code}`);
  revalidatePath("/admin/schemes");
  return { ok: true };
}

type AdminErr = (typeof DICTS)["hi"]["admin"]["err"];

const newSchema = (err: AdminErr) =>
  z.object({
    code: z.string().trim().regex(/^SCH-\d{3}$/, err.code),
    titleHi: z.string().trim().min(2).max(120),
    titleEn: z.string().trim().min(2).max(120),
    need: z.enum(needKeys),
    sourceUrl: z.string().trim().url(err.url),
    noticeText: z.string().trim().min(20, err.notice).max(10_000),
  });

export async function createScheme(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const { err } = await adminText();
  const parsed = newSchema(err).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await prisma.scheme.findUnique({ where: { code: parsed.data.code } })) return { error: err.codeTaken };
  const s = await prisma.scheme.create({
    data: { ...parsed.data, districts: [], documentsHi: [], rules: {}, lastChecked: new Date() },
  });
  await audit(admin.email, "create", s.id);
  redirect(`/admin/schemes/${s.id}`);
}

// --- Call-back inbox ------------------------------------------------------

export async function updateCallback(form: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({ id: z.string().min(1), handled: z.enum(["true", "false"]), note: z.string().max(500).default("") })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const handled = parsed.data.handled === "true";
  await prisma.callbackRequest.update({
    where: { id: parsed.data.id },
    data: { handled, note: parsed.data.note, handledBy: handled ? admin.email : null, handledAt: handled ? new Date() : null },
  });
  await prisma.auditLog.create({ data: { actor: admin.email, action: handled ? "callback_done" : "callback_reopen", entity: "Callback", entityId: parsed.data.id } });
  revalidatePath("/admin/callbacks");
  revalidatePath("/admin");
}

// --- Campaigns -------------------------------------------------------------

const campaignSchema = (err: AdminErr) =>
  z.object({
    id: z.string().optional(),
    slug: z.string().trim().regex(/^[a-z0-9-]{3,40}$/, err.slug),
    titleHi: z.string().trim().min(2).max(80),
    titleEn: z.string().trim().min(2).max(80),
    blurbHi: z.string().trim().min(10).max(300),
    blurbEn: z.string().trim().max(300).default(""),
    goal: z.coerce.number().int().min(10_000).max(1_000_000_000),
    active: z.enum(["on"]).optional(),
  });

export async function saveCampaign(_: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const { err } = await adminText();
  const parsed = campaignSchema(err).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, active, ...data } = parsed.data;
  const clash = await prisma.campaign.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) return { error: err.slugTaken };
  const c = id
    ? await prisma.campaign.update({ where: { id }, data: { ...data, active: !!active } })
    : await prisma.campaign.create({ data: { ...data, active: !!active } });
  await prisma.auditLog.create({ data: { actor: admin.email, action: id ? "campaign_update" : "campaign_create", entity: "Campaign", entityId: c.id } });
  revalidatePath("/admin/campaigns");
  revalidatePath("/");
  if (!id) redirect("/admin/campaigns");
  return { ok: true };
}

// --- Receipts --------------------------------------------------------------

export async function cancelReceiptAction(_: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const { err } = await adminText();
  const parsed = z.object({ receiptId: z.string().min(1), reason: z.string().trim().min(5, err.reason).max(300) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await cancelReceipt(parsed.data.receiptId, parsed.data.reason, admin.email);
  } catch (e) {
    if (e instanceof NotPayableError) return { error: err.alreadyCancelled };
    throw e;
  }
  await prisma.auditLog.create({ data: { actor: admin.email, action: "receipt_cancel", entity: "Receipt", entityId: parsed.data.receiptId, detail: parsed.data.reason } });
  revalidatePath("/admin/donations");
  return { ok: true };
}

export async function runMonthlyCharges(): Promise<{ mandates: number; receipts: string[] }> {
  const admin = await requireAdmin();
  const res = await runDueInstalments();
  for (const r of res.receipts) await afterPaid(r.donationId);
  await prisma.auditLog.create({ data: { actor: admin.email, action: "run_monthly", entity: "Mandate", entityId: "-", detail: `${res.receipts.length} receipts` } });
  revalidatePath("/admin");
  revalidatePath("/admin/donations");
  return { mandates: res.mandates, receipts: res.receipts.map((r) => r.number) };
}
