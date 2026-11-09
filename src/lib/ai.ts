import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseQuestion, PartialAnswers } from "./questionParser";
import { DISTRICTS } from "./content";
import type { Lang } from "./i18n";

// Structured outputs (output_config.format) return schema-valid JSON. Haiku 5.5
// is the cheapest current model and these are short extraction/drafting jobs.
// It has no server-side refusal fallback: a refusal falls back to the app's own
// path (keyword reader in the finder, manual writing in the CMS).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

function client(timeout: number) {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout, maxRetries: 1 });
}

// ---------------------------------------------------------------------------
// Scheme drafts (staff): official notice → plain Hindi + English
// ---------------------------------------------------------------------------

// What the model must return (shape only; length rules are checked after).
const draftOutput = z.object({
  summaryHi: z.string().describe("2-3 sentence plain Hindi summary"),
  benefitHi: z.string().describe("What the woman gets, one line, Hindi"),
  eligibilityHi: z.string().describe("Who can apply, plain Hindi"),
  documentsHi: z.array(z.string()).describe("Documents needed, Hindi"),
  howToApplyHi: z.string().describe("Steps to apply, plain Hindi"),
  notFound: z.array(z.string()).describe("Items the notice does not state, in Hindi"),
  summaryEn: z.string().describe("Same summary in plain English"),
  benefitEn: z.string(),
  eligibilityEn: z.string(),
  documentsEn: z.array(z.string()),
  howToApplyEn: z.string(),
});

// What we accept into the CMS.
export const draftSchema = z.object({
  summaryHi: z.string().min(10).max(600),
  benefitHi: z.string().min(2).max(300),
  eligibilityHi: z.string().min(2).max(500),
  documentsHi: z.array(z.string().min(1).max(120)).max(12),
  howToApplyHi: z.string().min(5).max(800),
  notFound: z.array(z.string().max(200)).max(10),
  summaryEn: z.string().max(600).default(""),
  benefitEn: z.string().max(300).default(""),
  eligibilityEn: z.string().max(500).default(""),
  documentsEn: z.array(z.string().min(1).max(120)).max(12).default([]),
  howToApplyEn: z.string().max(800).default(""),
});
export type SchemeDraft = z.infer<typeof draftSchema>;

export type DraftResult = { ok: true; draft: SchemeDraft } | { ok: false; error: string };

const DRAFT_SYSTEM = `You turn official Indian government scheme notices into plain Hindi for rural women in Madhya Pradesh who may have studied only up to class 5.
Rules:
- Use only facts present in the notice. Never invent amounts, ages, documents or offices.
- If something (benefit, eligibility, documents, how to apply) is not in the notice, keep that field short and list the missing item in notFound (in Hindi).
- Short sentences, everyday words (e.g. "पैसा" not "धनराशि" where natural). Numbers as digits with ₹.
- No promises: say "मिल सकता है", not "मिलेगा".
- Also give the same content in plain English (the *En fields), equally faithful to the notice.`;

const DRAFT_ERRORS = {
  hi: {
    noKey: "AI सेवा सेट नहीं है (ANTHROPIC_API_KEY नहीं मिला)। सारांश स्वयं लिखें।",
    refusal: "AI ने यह ड्राफ़्ट नहीं बनाया। सारांश स्वयं लिखें।",
    maxTokens: "AI का ड्राफ़्ट अधूरा रह गया। दोबारा कोशिश करें।",
    invalid: "AI का ड्राफ़्ट अधूरा था। दोबारा कोशिश करें या स्वयं लिखें।",
    unavailable: "AI सेवा अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें या स्वयं लिखें।",
  },
  en: {
    noKey: "The AI service isn't set up (ANTHROPIC_API_KEY is missing). Write the summary yourself.",
    refusal: "The AI didn't write this draft. Write the summary yourself.",
    maxTokens: "The AI draft was cut off. Please try again.",
    invalid: "The AI draft was incomplete. Try again or write it yourself.",
    unavailable: "The AI service isn't available right now. Try again shortly or write it yourself.",
  },
};

export async function draftHindiSummary(titleEn: string, noticeText: string, lang: Lang = "hi"): Promise<DraftResult> {
  const err = DRAFT_ERRORS[lang];
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: err.noKey };
  }
  try {
    const res = await client(90_000).messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(draftOutput) },
      system: DRAFT_SYSTEM,
      messages: [{ role: "user", content: `Scheme: ${titleEn}\n\nOfficial notice:\n"""\n${noticeText}\n"""` }],
    });
    if (res.stop_reason === "refusal") return { ok: false, error: err.refusal };
    if (res.stop_reason === "max_tokens") return { ok: false, error: err.maxTokens };
    const parsed = draftSchema.safeParse(res.parsed_output);
    if (!parsed.success) return { ok: false, error: err.invalid };
    return { ok: true, draft: parsed.data };
  } catch (e) {
    console.error("AI draft failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { ok: false, error: err.unavailable };
  }
}

// ---------------------------------------------------------------------------
// Finder: understand a typed or spoken question ("मैं 45 साल की विधवा हूँ...")
// ---------------------------------------------------------------------------

const districtKeys = DISTRICTS.map((d) => d.key) as [string, ...string[]];

// null = not clearly stated. The model must never guess.
const finderOutput = z.object({
  age: z.number().int().nullable(),
  marital: z.enum(["MARRIED", "WIDOW", "UNMARRIED", "SEPARATED"]).nullable(),
  bpl: z.enum(["YES", "NO", "UNSURE"]).nullable().describe("Has a BPL ration card"),
  shg: z.enum(["YES", "NO", "UNSURE"]).nullable().describe("Member of a self-help group"),
  pregnancy: z.enum(["FIRST", "LATER", "NO"]).nullable().describe("Pregnant with first child / later child / not pregnant"),
  district: z.enum(districtKeys).nullable(),
});

const FINDER_SYSTEM =
  "You extract facts from a woman's message (Hindi, Hinglish or English) for a government-scheme finder in Madhya Pradesh. " +
  "Fill a field only when the message clearly states it; otherwise return null. Never guess. Districts: " +
  DISTRICTS.map((d) => `${d.key}=${d.hi}`).join(", ");

export type ParseResult = { answers: PartialAnswers; source: "AI" | "RULES"; note?: string };

function clean(p: z.infer<typeof finderOutput>): PartialAnswers {
  const out: PartialAnswers = {};
  for (const [k, v] of Object.entries(p)) if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v;
  if (out.age !== undefined && (out.age < 14 || out.age > 110)) delete out.age;
  return out;
}

export async function understandQuestion(text: string): Promise<ParseResult> {
  const rules = parseQuestion(text);
  if (!process.env.ANTHROPIC_API_KEY) return { answers: rules, source: "RULES" };

  try {
    const res = await client(20_000).messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(finderOutput) },
      system: FINDER_SYSTEM,
      messages: [{ role: "user", content: text.slice(0, 1000) }],
    });
    if (res.stop_reason !== "end_turn" || !res.parsed_output) return { answers: rules, source: "RULES", note: "AI_INVALID" };
    // AI wins where it found something; the rules reader fills any gaps.
    return { answers: { ...rules, ...clean(res.parsed_output) }, source: "AI" };
  } catch (e) {
    console.error("AI finder parse failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { answers: rules, source: "RULES", note: "AI_DOWN" };
  }
}
