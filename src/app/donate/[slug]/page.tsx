import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { pick } from "@/lib/content";
import { formatINR } from "@/lib/money";
import { DonateFlow } from "./DonateFlow";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [c, { lang, t }] = await Promise.all([prisma.campaign.findUnique({ where: { slug: (await params).slug } }), getT()]);
  return { title: c ? `${t.nav.donate}: ${lang === "en" ? c.titleEn : c.titleHi}` : t.nav.donate };
}

export default async function DonatePage({ params }: { params: Params }) {
  const [{ slug }, { lang, t }, session] = await Promise.all([params, getT(), getSession()]);
  const [campaign, others] = await Promise.all([
    prisma.campaign.findFirst({ where: { slug, active: true } }),
    prisma.campaign.findMany({ where: { active: true, NOT: { slug } }, select: { slug: true, titleHi: true, titleEn: true } }),
  ]);
  if (!campaign) notFound();
  const agg = await prisma.donation.aggregate({ where: { campaignId: campaign.id, status: "PAID" }, _sum: { amount: true }, _count: true });
  const raised = agg._sum.amount ?? 0;
  const pct = Math.min(100, Math.round((raised / campaign.goal) * 100));

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="grid gap-3">
                <h1 className="text-[2.1rem] leading-tight">{lang === "en" ? campaign.titleEn : campaign.titleHi}</h1>
        <p className="text-muted">{pick(lang, campaign.blurbHi, campaign.blurbEn)}</p>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t.home.progress}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
          <p className="mt-1.5 text-[0.9rem] text-muted">
            <strong className="text-ink">{formatINR(raised)}</strong> {t.home.raised}, {agg._count} {t.home.donors}. {t.home.goal} {formatINR(campaign.goal)}
          </p>
        </div>
        {others.length > 0 && (
          <p className="text-[0.95rem]">
            {t.donate.other}{" "}
            {others.map((o) => (
              <Link prefetch={false} key={o.slug} href={`/donate/${o.slug}`} className="text-accent underline">{lang === "en" ? o.titleEn : o.titleHi}</Link>
            ))}
          </p>
        )}
      </div>
      <DonateFlow
        lang={lang}
        campaignSlug={campaign.slug}
        prefill={session?.role === "DONOR" ? { name: session.name, email: session.email } : undefined}
      />
    </div>
  );
}
