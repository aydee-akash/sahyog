import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const draftSchema = z.object({
  summaryHi: z.string().min(10).max(600),
  benefitHi: z.string().min(2).max(300),
  eligibilityHi: z.string().min(2).max(500),
  documentsHi: z.array(z.string().min(1).max(120)).max(12),
  howToApplyHi: z.string().min(5).max(800),
  notFound: z.array(z.string().max(200)).max(10),
});
export type SchemeDraft = z.infer<typeof draftSchema>;

export type DraftResult = { ok: true; draft: SchemeDraft } | { ok: false; error: string };

const SYSTEM = `You turn official Indian government scheme notices into plain Hindi for rural women in Madhya Pradesh who may have studied only up to class 5.
Rules:
- Use only facts present in the notice. Never invent amounts, ages, documents or offices.
- If something (benefit, eligibility, documents, how to apply) is not in the notice, leave that field short and list the missing item in notFound (in Hindi).
- Short sentences, everyday words (e.g. "पैसा" not "धनराशि" where natural). Numbers as digits with ₹.
- No promises: say "मिल सकता है", not "मिलेगा".`;

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
      notFound: { type: "array", items: { type: "string" }, description: "Items the notice does not state" },
    },
    required: ["summaryHi", "benefitHi", "eligibilityHi", "documentsHi", "howToApplyHi", "notFound"],
  },
};

export async function draftHindiSummary(titleEn: string, noticeText: string): Promise<DraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI सेवा सेट नहीं है (ANTHROPIC_API_KEY नहीं मिला)। सारांश स्वयं लिखें।" };

  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  try {
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 1500,
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
