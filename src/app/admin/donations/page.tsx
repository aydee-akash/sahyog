import { Download, Search } from "lucide-react";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/content";
import { getT } from "@/lib/lang";
import { financialYear } from "@/lib/fy";
import { CancelReceiptButton, CancelReceiptDialog } from "./CancelReceipt";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.donations };
}

type Search = Promise<{ campaign?: string; q?: string; freq?: string }>;

export default async function AdminDonations({ searchParams }: { searchParams: Search }) {
  const [{ campaign, q, freq }, { lang, t }] = await Promise.all([searchParams, getT()]);
  const a = t.admin.donations;
  const title = (c: { titleHi: string; titleEn: string }) => (lang === "en" ? c.titleEn : c.titleHi);
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
      <CancelReceiptDialog lang={lang} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem]">{a.title}</h1>
          <p className="text-muted">{a.lead}</p>
        </div>
        <a href={`/api/admin/form10bd?fy=${fy}`} className="btn-secondary"><Download className="size-4" aria-hidden /> Form 10BD CSV ({fy})</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {campaigns.map((c) => {
          const raised = byId[c.id]?._sum.amount ?? 0;
          return (
            <a key={c.id} href={`/admin/donations?campaign=${c.slug}`} className={`card grid gap-1 p-4 hover:border-accent ${campaign === c.slug ? "border-accent" : ""}`}>
              <span className="font-semibold">{title(c)}</span>
              <span className="text-2xl font-bold">{formatINR(raised)}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-accent-soft"><span className="block h-full bg-accent" style={{ width: `${Math.min(100, (raised / c.goal) * 100)}%` }} /></span>
              <span className="text-[0.85rem] text-muted">{a.campaignSub(byId[c.id]?._count ?? 0, formatINR(c.goal))}</span>
            </a>
          );
        })}
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-3" role="search">
        <label className="grid min-w-48 flex-1 gap-1 text-[0.9rem]">
          {a.search}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={query} className="input min-h-11 pl-9" />
          </span>
        </label>
        <label className="grid gap-1 text-[0.9rem]">
          {a.campaign}
          <select name="campaign" defaultValue={campaign ?? ""} className="input min-h-11 w-auto">
            <option value="">{a.all}</option>
            {campaigns.map((c) => <option key={c.id} value={c.slug}>{title(c)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[0.9rem]">
          {a.type}
          <select name="freq" defaultValue={freq ?? ""} className="input min-h-11 w-auto">
            <option value="">{a.all}</option>
            <option value="ONE_TIME">{a.oneTime}</option>
            <option value="MONTHLY">{a.monthly}</option>
          </select>
        </label>
        <button className="btn-primary min-h-11">{a.apply}</button>
        {(query || campaign || freq) && <a href="/admin/donations" className="btn-ghost min-h-11">{a.clear}</a>}
      </form>

      <p className="text-[0.9rem] text-muted">{a.count(count)}</p>
      {rows.length === 0 ? (
        <p className="card p-6 text-muted">{a.empty}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[0.95rem]">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3 font-semibold">{a.receipt}</th>
                <th className="p-3 font-semibold">{a.donor}</th>
                <th className="p-3 font-semibold">{a.campaign}</th>
                <th className="p-3 text-right font-semibold">{a.amount}</th>
                <th className="p-3 font-semibold">{a.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => (
                <tr key={d.id} className={d.receipt?.cancelledAt ? "bg-bad-soft/40" : ""}>
                  <td className="p-3">
                    <span className={d.receipt?.cancelledAt ? "line-through" : ""}>{d.receipt?.number}</span>
                    {d.receipt?.cancelledAt && <span className="badge ml-1 bg-bad-soft text-bad">{a.cancelled}</span>}
                    <span className="block text-[0.85rem] text-muted">{formatDate(d.createdAt, lang)}</span>
                    {d.receipt?.cancelReason && <span className="block text-[0.8rem] text-bad">{a.reason(d.receipt.cancelReason)}</span>}
                  </td>
                  <td className="p-3">{d.donorName}<span className="block text-[0.85rem] text-muted">{d.donorPan}</span></td>
                  <td className="p-3">
                    {title(d.campaign)}
                    {d.frequency === "MONTHLY" && <span className="badge ml-1 bg-accent-soft text-accent-strong">{d.parentId ? a.instalment : a.monthly}</span>}
                  </td>
                  <td className="p-3 text-right font-semibold">{formatINR(d.amount)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <a className="text-accent underline" href={`/api/receipts/${d.id}`} target="_blank" rel="noopener">PDF</a>
                      {d.receipt && !d.receipt.cancelledAt && <CancelReceiptButton lang={lang} receiptId={d.receipt.id} number={d.receipt.number} />}
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
