import { Download, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatDateHi } from "@/lib/content";
import { financialYear } from "@/lib/fy";
import { CancelReceipt } from "./CancelReceipt";

export const metadata = { title: "दान और रसीदें | एडमिन" };

type Search = Promise<{ campaign?: string; q?: string; freq?: string }>;

export default async function AdminDonations({ searchParams }: { searchParams: Search }) {
  const { campaign, q, freq } = await searchParams;
  const fy = financialYear(new Date());
  const query = q?.trim().slice(0, 60);

  const where: Prisma.DonationWhereInput = {
    status: "PAID",
    ...(campaign ? { campaign: { slug: campaign } } : {}),
    ...(freq === "MONTHLY" ? { frequency: "MONTHLY" } : freq === "ONE_TIME" ? { frequency: "ONE_TIME" } : {}),
    ...(query
      ? {
          OR: [
            { donorName: { contains: query, mode: "insensitive" } },
            { donorPan: { contains: query.toUpperCase() } },
            { donorEmail: { contains: query.toLowerCase() } },
            { receipt: { number: { contains: query.toUpperCase() } } },
          ],
        }
      : {}),
  };

  const [campaigns, totals, rows, count] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { slug: "asc" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID", receipt: { cancelledAt: null } }, _sum: { amount: true }, _count: true }),
    prisma.donation.findMany({ where, include: { receipt: true, campaign: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.donation.count({ where }),
  ]);
  const byId = Object.fromEntries(totals.map((t) => [t.campaignId, t]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem]">दान और रसीदें</h1>
          <p className="text-muted">हर रसीद अपने-आप बनती है। रद्द रसीद का नंबर दोबारा इस्तेमाल नहीं होता।</p>
        </div>
        <a href={`/api/admin/form10bd?fy=${fy}`} className="btn-secondary"><Download className="size-4" aria-hidden /> Form 10BD CSV ({fy})</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {campaigns.map((c) => {
          const raised = byId[c.id]?._sum.amount ?? 0;
          return (
            <a key={c.id} href={`/admin/donations?campaign=${c.slug}`} className={`card grid gap-1 p-4 hover:border-accent ${campaign === c.slug ? "border-accent" : ""}`}>
              <span className="font-semibold">{c.titleHi}</span>
              <span className="text-2xl font-bold">{formatINR(raised)}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-accent-soft"><span className="block h-full bg-accent" style={{ width: `${Math.min(100, (raised / c.goal) * 100)}%` }} /></span>
              <span className="text-[0.85rem] text-muted">{byId[c.id]?._count ?? 0} दान, लक्ष्य {formatINR(c.goal)}</span>
            </a>
          );
        })}
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-3" role="search">
        <label className="grid min-w-48 flex-1 gap-1 text-[0.9rem]">
          खोजें (नाम, PAN, ईमेल, रसीद नंबर)
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={query} className="input min-h-11 pl-9" />
          </span>
        </label>
        <label className="grid gap-1 text-[0.9rem]">
          अभियान
          <select name="campaign" defaultValue={campaign ?? ""} className="input min-h-11 w-auto">
            <option value="">सभी</option>
            {campaigns.map((c) => <option key={c.id} value={c.slug}>{c.titleHi}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[0.9rem]">
          प्रकार
          <select name="freq" defaultValue={freq ?? ""} className="input min-h-11 w-auto">
            <option value="">सभी</option>
            <option value="ONE_TIME">एक बार</option>
            <option value="MONTHLY">मासिक</option>
          </select>
        </label>
        <button className="btn-primary min-h-11">लागू करें</button>
        {(query || campaign || freq) && <a href="/admin/donations" className="btn-ghost min-h-11">हटाएँ</a>}
      </form>

      <p className="text-[0.9rem] text-muted">{count} दान{count > 50 ? " (पहले 50 दिखाए)" : ""}</p>
      {rows.length === 0 ? (
        <p className="card p-6 text-muted">इस खोज से कोई दान नहीं मिला।</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[0.95rem]">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3 font-semibold">रसीद</th>
                <th className="p-3 font-semibold">दानदाता</th>
                <th className="p-3 font-semibold">अभियान</th>
                <th className="p-3 text-right font-semibold">राशि</th>
                <th className="p-3 font-semibold">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => (
                <tr key={d.id} className={d.receipt?.cancelledAt ? "bg-bad-soft/40" : ""}>
                  <td className="p-3">
                    <span className={d.receipt?.cancelledAt ? "line-through" : ""}>{d.receipt?.number}</span>
                    {d.receipt?.cancelledAt && <span className="badge ml-1 bg-bad-soft text-bad">रद्द</span>}
                    <span className="block text-[0.85rem] text-muted">{formatDateHi(d.createdAt)}</span>
                    {d.receipt?.cancelReason && <span className="block text-[0.8rem] text-bad">कारण: {d.receipt.cancelReason}</span>}
                  </td>
                  <td className="p-3">{d.donorName}<span className="block text-[0.85rem] text-muted">{d.donorPan}</span></td>
                  <td className="p-3">
                    {d.campaign.titleHi}
                    {d.frequency === "MONTHLY" && <span className="badge ml-1 bg-accent-soft text-accent-strong">{d.parentId ? "किस्त" : "मासिक"}</span>}
                  </td>
                  <td className="p-3 text-right font-semibold">{formatINR(d.amount)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <a className="text-accent underline" href={`/api/receipts/${d.id}`} target="_blank" rel="noopener">PDF</a>
                      {d.receipt && !d.receipt.cancelledAt && <CancelReceipt receiptId={d.receipt.id} number={d.receipt.number} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
