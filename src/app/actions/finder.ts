"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Check, Rules, evaluate } from "@/lib/eligibility";
import { DISTRICTS } from "@/lib/content";

const districtKeys = DISTRICTS.map((d) => d.key) as [string, ...string[]];

const answersSchema = z.object({
  age: z.coerce.number().int().min(14).max(110),
  marital: z.enum(["MARRIED", "WIDOW", "UNMARRIED", "SEPARATED"]),
  bpl: z.enum(["YES", "NO", "UNSURE"]),
  shg: z.enum(["YES", "NO", "UNSURE"]),
  pregnancy: z.enum(["FIRST", "LATER", "NO"]),
  district: z.enum(districtKeys),
});

export type FinderMatch = {
  code: string;
  titleHi: string;
  benefitHi: string;
  verdict: "LIKELY" | "MAYBE";
  checks: Check[];
};

export type FinderResult = { ok: true; matches: FinderMatch[] } | { ok: false; error: string };

export async function findSchemes(input: unknown): Promise<FinderResult> {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "कुछ जवाब अधूरे हैं। कृपया दोबारा देखें।" };

  const schemes = await prisma.scheme.findMany({ where: { status: "PUBLISHED" }, orderBy: { code: "asc" } });
  const matches: FinderMatch[] = [];
  for (const s of schemes) {
    const m = evaluate(s.rules as Rules, s.districts, parsed.data);
    if (m.verdict !== "NO") {
      matches.push({ code: s.code, titleHi: s.titleHi, benefitHi: s.benefitHi, verdict: m.verdict, checks: m.checks });
    }
  }
  matches.sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "LIKELY" ? -1 : 1));
  return { ok: true, matches };
}

const callbackSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "10 अंकों का मोबाइल नंबर लिखें"),
  district: z.enum(districtKeys),
  schemeCodes: z.array(z.string().max(20)).max(20),
  consent: z.literal(true, { errorMap: () => ({ message: "कॉल के लिए सहमति ज़रूरी है" }) }),
});

export async function requestCallback(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = callbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "जानकारी सही नहीं है" };
  const { phone, district, schemeCodes } = parsed.data;
  await prisma.callbackRequest.create({ data: { phone, district, schemeCodes } });
  return { ok: true };
}
