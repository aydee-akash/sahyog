import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseQuestion, PartialAnswers } from "./questionParser";
import { DISTRICTS } from "./content";

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

const SYSTEM = `You turn official Indian government scheme notices into plain Hindi for rural women in Madhya Pradesh who may have studied only up to class 5.
Rules:
- Use only facts present in the notice. Never invent amounts, ages, documents or offices.
- If something (benefit, eligibility, documents, how to apply) is not in the notice, leave that field short and list the missing item in notFound (in Hindi).
- Short sentences, everyday words (e.g. "पैसा" not "धनराशि" where natural). Numbers as digits with ₹.
- No promises: say "मिल सकता है", not "मिलेगा".
- Also give the same content in plain English (the *En fields), equally faithful to the notice.`;

const TOOL: Anthropic.Tool = {
  name: "save_hindi_draft",
  description: "Save the plain-Hindi draft of the scheme for an editor to review.",
  input_schema: {
    type: "object",
    properties: {
      summaryHi: { type: "string", description: "2-3 sentence plain Hindi summary" },
      benefitHi: { type: "string", description: "What the woman gets, one line" },
      eligibilityHi: { type: "string", description: "Who can apply, plain Hindi" },
      documentsHi: { type: "array", items: { type: "string" }, description: "Documents needed" },
      howToApplyHi: { type: "string", description: "Steps to apply, plain Hindi" },
      notFound: { type: "array", items: { type: "string" }, description: "Items the notice does not state (Hindi)" },
      summaryEn: { type: "string", description: "Same summary in plain English" },
      benefitEn: { type: "string" },
      eligibilityEn: { type: "string" },
      documentsEn: { type: "array", items: { type: "string" } },
      howToApplyEn: { type: "string" },
    },
    required: ["summaryHi", "benefitHi", "eligibilityHi", "documentsHi", "howToApplyHi", "notFound", "summaryEn", "benefitEn", "eligibilityEn", "documentsEn", "howToApplyEn"],
  },
};

export async function draftHindiSummary(titleEn: string, noticeText: string): Promise<DraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI सेवा सेट नहीं है (ANTHROPIC_API_KEY नहीं मिला)। सारांश स्वयं लिखें।" };

  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  try {
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 2500,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: `Scheme: ${titleEn}\n\nOfficial notice:\n"""\n${noticeText}\n"""` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, error: "AI ने ड्राफ़्ट नहीं लौटाया। दोबारा कोशिश करें।" };
    const parsed = draftSchema.safeParse(block.input);
    if (!parsed.success) return { ok: false, error: "AI का ड्राफ़्ट अधूरा था। दोबारा कोशिश करें या स्वयं लिखें।" };
    return { ok: true, draft: parsed.data };
  } catch (e) {
    console.error("AI draft failed", e);
    return { ok: false, error: "AI सेवा अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें या स्वयं लिखें।" };
  }
}

// ---------------------------------------------------------------------------
// Finder: understand a typed or spoken question ("मैं 45 साल की विधवा हूँ...")
// ---------------------------------------------------------------------------

const partialSchema = z.object({
  age: z.number().int().min(14).max(110).nullable().optional(),
  marital: z.enum(["MARRIED", "WIDOW", "UNMARRIED", "SEPARATED"]).nullable().optional(),
  bpl: z.enum(["YES", "NO", "UNSURE"]).nullable().optional(),
  shg: z.enum(["YES", "NO", "UNSURE"]).nullable().optional(),
  pregnancy: z.enum(["FIRST", "LATER", "NO"]).nullable().optional(),
  district: z.enum(DISTRICTS.map((d) => d.key) as [string, ...string[]]).nullable().optional(),
});

const FINDER_TOOL: Anthropic.Tool = {
  name: "record_answers",
  description: "Record only the facts the woman clearly stated. Use null for anything not stated.",
  input_schema: {
    type: "object",
    properties: {
      age: { type: ["integer", "null"] },
      marital: { type: ["string", "null"], enum: ["MARRIED", "WIDOW", "UNMARRIED", "SEPARATED", null] },
      bpl: { type: ["string", "null"], enum: ["YES", "NO", "UNSURE", null], description: "Has a BPL ration card" },
      shg: { type: ["string", "null"], enum: ["YES", "NO", "UNSURE", null], description: "Member of a self-help group" },
      pregnancy: { type: ["string", "null"], enum: ["FIRST", "LATER", "NO", null], description: "Pregnant with first child / later child / not pregnant" },
      district: { type: ["string", "null"], enum: [...DISTRICTS.map((d) => d.key), null] },
    },
    required: ["age", "marital", "bpl", "shg", "pregnancy", "district"],
  },
};

export type ParseResult = { answers: PartialAnswers; source: "AI" | "RULES"; note?: string };

function clean(p: z.infer<typeof partialSchema>): PartialAnswers {
  const out: PartialAnswers = {};
  for (const [k, v] of Object.entries(p)) if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

export async function understandQuestion(text: string): Promise<ParseResult> {
  const rules = parseQuestion(text);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { answers: rules, source: "RULES" };

  try {
    const client = new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 300,
      system:
        "You extract facts from a woman's message (Hindi, Hinglish or English) for a government-scheme finder in Madhya Pradesh. " +
        "Never guess: if a fact is not clearly stated, return null. Districts: " +
        DISTRICTS.map((d) => `${d.key}=${d.hi}`).join(", "),
      tools: [FINDER_TOOL],
      tool_choice: { type: "tool", name: FINDER_TOOL.name },
      messages: [{ role: "user", content: text.slice(0, 1000) }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    const parsed = block && block.type === "tool_use" ? partialSchema.safeParse(block.input) : null;
    if (!parsed?.success) return { answers: rules, source: "RULES", note: "AI_INVALID" };
    // AI wins where it found something; the rules reader fills any gaps.
    return { answers: { ...rules, ...clean(parsed.data) }, source: "AI" };
  } catch (e) {
    console.error("AI finder parse failed", e);
    return { answers: rules, source: "RULES", note: "AI_DOWN" };
  }
}
