import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { formatDateHi } from "@/lib/content";
import { financialYear } from "@/lib/fy";
import { AdminNav } from "../AdminNav";

export const metadata = { title: "दान और रसीदें · एडमिन" };

export default async function AdminDonations() {
  await requireAdmin();
  const fy = financialYear(new Date());
  const [campaigns, totals, recent, callbacks] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { slug: "asc" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.donation.findMany({ where: { status: "PAID" }, include: { receipt: true, campaign: true }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.callbackRequest.count(),
  ]);
  const byId = Object.fromEntries(totals.map((t) => [t.campaignId, t]));

  return (
    <div className="grid gap-6">
      <AdminNav active="donations" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-bold">दान और रसीदें</h1>
          <p className="text-muted">हर रसीद अपने-आप बनती है। कॉल-बैक अनुरोध: {callbacks}</p>
        </div>
        <a href={`/api/admin/form10bd?fy=${fy}`} className="btn-secondary">Form 10BD CSV ({fy})</a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => (
          <div key={c.id} className="card p-5">
            <p className="font-semibold">{c.titleHi}</p>
            <p className="text-2xl font-bold">{formatINR(byId[c.id]?._sum.amount ?? 0)}</p>
            <p className="text-[0.9rem] text-muted">{byId[c.id]?._count ?? 0} दान · लक्ष्य {formatINR(c.goal)}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[0.95rem]">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="p-3 font-semibold">रसीद</th>
              <th className="p-3 font-semibold">दानदाता</th>
              <th className="p-3 font-semibold">अभियान</th>
              <th className="p-3 text-right font-semibold">राशि</th>
              <th className="p-3 font-semibold">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recent.map((d) => (
              <tr key={d.id}>
                <td className="p-3">{d.receipt?.number}<span className="block text-[0.85rem] text-muted">{formatDateHi(d.createdAt)}</span></td>
                <td className="p-3">{d.donorName}<span className="block text-[0.85rem] text-muted">{d.donorPan}</span></td>
                <td className="p-3">{d.campaign.titleHi}</td>
                <td className="p-3 text-right font-semibold">{formatINR(d.amount)}</td>
                <td className="p-3"><a className="text-accent underline" href={`/api/receipts/${d.id}`} target="_blank" rel="noopener">देखें</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
