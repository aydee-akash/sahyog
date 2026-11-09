import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/money";
import { CampaignForm } from "./CampaignForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.campaigns };
}

export default async function Campaigns() {
  const [campaigns, sums, { lang, t }] = await Promise.all([
    prisma.campaign.findMany({ orderBy: [{ active: "desc" }, { slug: "asc" }] }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID" }, _sum: { amount: true } }),
    getT(),
  ]);
  const a = t.admin.campaigns;
  const raised = Object.fromEntries(sums.map((s) => [s.campaignId, s._sum.amount ?? 0]));
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[1.75rem]">{a.title}</h1>
        <p className="text-muted">{a.lead}</p>
      </div>
      {campaigns.map((c) => (
        <details key={c.id} className="card group p-0">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
            <span>
              <span className="font-semibold">{lang === "en" ? c.titleEn : c.titleHi}</span> <span className="text-muted">/ {lang === "en" ? c.titleHi : c.titleEn}</span>
              <span className={`badge ml-2 ${c.active ? "bg-ok-soft text-ok" : "bg-line text-muted"}`}>{c.active ? a.active : a.closed}</span>
            </span>
            <span className="text-[0.9rem] text-muted">{formatINR(raised[c.id] ?? 0)} / {formatINR(c.goal)}, {a.edit}</span>
          </summary>
          <div className="border-t border-line p-4">
            <CampaignForm lang={lang} campaign={c} />
          </div>
        </details>
      ))}
      <section className="card grid gap-3 p-4" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg">{a.new}</h2>
        <CampaignForm lang={lang} />
      </section>
    </div>
  );
}
