"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SchemeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { draftHindiSummary, DraftResult } from "@/lib/ai";
import { canTransition, missingForReview } from "@/lib/workflow";
import { DISTRICTS, NEEDS } from "@/lib/content";

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
  sourceUrl: z.string().trim().url(),
  noticeText: z.string().trim().min(20).max(10_000),
  lastChecked: z.coerce.date(),
  rules: rulesSchema,
  aiDrafted: z.boolean(),
});

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
  if (!existing) return { ok: false, error: "योजना नहीं मिली" };
  // Any edit sends the scheme back to draft so it is reviewed again.
  await prisma.scheme.update({
    where: { id },
    data: { ...parsed.data, status: "DRAFT", reviewedBy: null },
  });
  await audit(admin.email, existing.status === "PUBLISHED" ? "edit_unpublished" : "save", id);
  revalidatePath("/");
  revalidatePath(`/schemes/${existing.code}`);
  return { ok: true };
}

export async function generateDraft(id: string): Promise<DraftResult> {
  const admin = await requireAdmin();
  const s = await prisma.scheme.findUnique({ where: { id } });
  if (!s) return { ok: false, error: "योजना नहीं मिली" };
  const res = await draftHindiSummary(s.titleEn, s.noticeText);
  await audit(admin.email, res.ok ? "ai_draft" : "ai_draft_failed", id, res.ok ? "" : res.error);
  return res;
}

export async function transitionScheme(id: string, to: SchemeStatus): Promise<SaveResult> {
  const admin = await requireAdmin();
  const s = await prisma.scheme.findUnique({ where: { id } });
  if (!s) return { ok: false, error: "योजना नहीं मिली" };
  if (!canTransition(s.status, to)) return { ok: false, error: "यह बदलाव संभव नहीं है" };
  if (to === "IN_REVIEW") {
    const missing = missingForReview(s);
    if (missing.length) return { ok: false, error: `पहले भरें: ${missing.join(", ")}` };
  }
  await prisma.scheme.update({
    where: { id },
    data: { status: to, reviewedBy: to === "PUBLISHED" ? admin.email : null },
  });
  await audit(admin.email, `status:${s.status}->${to}`, id);
  revalidatePath("/");
  revalidatePath(`/schemes/${s.code}`);
  revalidatePath("/admin/schemes");
  return { ok: true };
}

const newSchema = z.object({
  code: z.string().trim().regex(/^SCH-\d{3}$/, "कोड SCH-123 जैसा हो"),
  titleHi: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  need: z.enum(needKeys),
  sourceUrl: z.string().trim().url("सही URL लिखें"),
  noticeText: z.string().trim().min(20, "आधिकारिक सूचना का पाठ चिपकाएँ").max(10_000),
});

export async function createScheme(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const parsed = newSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await prisma.scheme.findUnique({ where: { code: parsed.data.code } })) return { error: "यह कोड पहले से है" };
  const s = await prisma.scheme.create({
    data: { ...parsed.data, districts: [], documentsHi: [], rules: {}, lastChecked: new Date() },
  });
  await audit(admin.email, "create", s.id);
  redirect(`/admin/schemes/${s.id}`);
}
