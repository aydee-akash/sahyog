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

export type MissingField = "summary" | "benefit" | "eligibility" | "howToApply" | "documents";

export function missingForReview(s: Content): MissingField[] {
  const missing: MissingField[] = [];
  if (!s.summaryHi.trim()) missing.push("summary");
  if (!s.benefitHi.trim()) missing.push("benefit");
  if (!s.eligibilityHi.trim()) missing.push("eligibility");
  if (!s.howToApplyHi.trim()) missing.push("howToApply");
  if (s.documentsHi.length === 0) missing.push("documents");
  return missing;
}
