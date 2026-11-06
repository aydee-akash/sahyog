import type { SchemeStatus } from "@prisma/client";

// Editorial workflow: nothing reaches the public site without passing review.
const ALLOWED: Record<SchemeStatus, SchemeStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["DRAFT"],
};

export function canTransition(from: SchemeStatus, to: SchemeStatus): boolean {
  return ALLOWED[from].includes(to);
}

type Content = { summaryHi: string; benefitHi: string; eligibilityHi: string; howToApplyHi: string; documentsHi: string[] };

export function missingForReview(s: Content): string[] {
  const missing: string[] = [];
  if (!s.summaryHi.trim()) missing.push("सारांश");
  if (!s.benefitHi.trim()) missing.push("लाभ");
  if (!s.eligibilityHi.trim()) missing.push("कौन आवेदन कर सकती है");
  if (!s.howToApplyHi.trim()) missing.push("आवेदन कैसे करें");
  if (s.documentsHi.length === 0) missing.push("ज़रूरी कागज़");
  return missing;
}
