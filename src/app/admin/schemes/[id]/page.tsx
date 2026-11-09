import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Rules } from "@/lib/eligibility";
import { Editor } from "./Editor";

export const metadata = { title: "योजना संपादित करें | एडमिन" };

export default async function EditScheme({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [s, log] = await Promise.all([
    prisma.scheme.findUnique({ where: { id } }),
    prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  if (!s) notFound();

  return (
    <div className="grid gap-6">
      <Link prefetch={false} href="/admin/schemes" className="text-accent">← सभी योजनाएँ</Link>
      <Editor
        scheme={{
          id: s.id,
          code: s.code,
          status: s.status,
          reviewedBy: s.reviewedBy,
          content: {
            titleHi: s.titleHi,
            titleEn: s.titleEn,
            need: s.need,
            districts: s.districts,
            summaryHi: s.summaryHi,
            benefitHi: s.benefitHi,
            eligibilityHi: s.eligibilityHi,
            documentsHi: s.documentsHi,
            howToApplyHi: s.howToApplyHi,
            summaryEn: s.summaryEn,
            benefitEn: s.benefitEn,
            eligibilityEn: s.eligibilityEn,
            documentsEn: s.documentsEn,
            howToApplyEn: s.howToApplyEn,
            sourceUrl: s.sourceUrl,
            noticeText: s.noticeText,
            lastChecked: s.lastChecked.toISOString().slice(0, 10),
            rules: s.rules as Rules,
            aiDrafted: s.aiDrafted,
          },
        }}
        log={log.map((l) => ({ id: l.id, actor: l.actor, action: l.action, at: l.createdAt.toISOString() }))}
      />
    </div>
  );
}
