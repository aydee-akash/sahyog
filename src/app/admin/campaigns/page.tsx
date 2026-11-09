import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { CampaignForm } from "./CampaignForm";

export const metadata = { title: "अभियान | एडमिन" };

export default async function Campaigns() {
  const [campaigns, sums] = await Promise.all([
    prisma.campaign.findMany({ orderBy: [{ active: "desc" }, { slug: "asc" }] }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID" }, _sum: { amount: true } }),
  ]);
  const raised = Object.fromEntries(sums.map((s) => [s.campaignId, s._sum.amount ?? 0]));
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[1.75rem]">अभियान</h1>
        <p className="text-muted">हर अभियान का अपना दान पेज होता है: /donate/slug। बंद अभियान होम पेज से हट जाते हैं, पुराने दान और रसीदें बनी रहती हैं।</p>
      </div>
      {campaigns.map((c) => (
        <details key={c.id} className="card group p-0">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
            <span>
              <span className="font-semibold">{c.titleHi}</span> <span className="text-muted">/ {c.titleEn}</span>
              <span className={`badge ml-2 ${c.active ? "bg-ok-soft text-ok" : "bg-line text-muted"}`}>{c.active ? "चालू" : "बंद"}</span>
            </span>
            <span className="text-[0.9rem] text-muted">{formatINR(raised[c.id] ?? 0)} / {formatINR(c.goal)}, बदलें ▾</span>
          </summary>
          <div className="border-t border-line p-4">
            <CampaignForm campaign={c} />
          </div>
        </details>
      ))}
      <section className="card grid gap-3 p-4" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg">+ नया अभियान</h2>
        <CampaignForm />
      </section>
    </div>
  );
}
