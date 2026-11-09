import Link from "next/link";
import { CalendarClock, Download, HandHeart, Pause, Play, Receipt, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/content";
import { financialYear } from "@/lib/fy";
import { manageMandate } from "@/app/actions/account";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "मेरा खाता / My account" };

export default async function Account() {
  const [session, { lang, t }] = await Promise.all([requireUser("/account"), getT()]);
  const a = t.account;
  const [donations, mandates] = await Promise.all([
    prisma.donation.findMany({
      where: { userId: session.userId, status: "PAID" },
      include: { receipt: true, campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.donation.findMany({
      where: { userId: session.userId, frequency: "MONTHLY", parentId: null, status: "PAID", mandateStatus: { not: null } },
      include: { campaign: true, _count: { select: { instalments: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const valid = donations.filter((d) => !d.receipt?.cancelledAt);
  const total = valid.reduce((s, d) => s + d.amount, 0);
  const fy = financialYear(new Date());
  const thisFy = valid.filter((d) => d.receipt?.fy === fy).reduce((s, d) => s + d.amount, 0);
  const byFy = new Map<string, typeof donations>();
  for (const d of donations) {
    const k = d.receipt?.fy ?? fy;
    byFy.set(k, [...(byFy.get(k) ?? []), d]);
  }
  const statusLabel = { ACTIVE: a.statusActive, PAUSED: a.statusPaused, CANCELLED: a.statusCancelled } as const;
  const statusStyle = { ACTIVE: "bg-ok-soft text-ok", PAUSED: "bg-warn-soft text-warn", CANCELLED: "bg-line text-muted" } as const;

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-[2rem]">{a.hello(session.name.split(" ")[0])}</h1>
        <p className="text-muted">{a.lead}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [a.total, formatINR(total)],
          [`${a.thisFy} (${fy})`, formatINR(thisFy)],
          [a.count, String(valid.length)],
          [a.monthly, mandates.some((m) => m.mandateStatus === "ACTIVE") ? `${formatINR(mandates.find((m) => m.mandateStatus === "ACTIVE")!.amount)}${t.donate.perMonth}` : a.none],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[0.9rem] text-muted">{label}</p>
            <p className="text-xl font-bold sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>

      {mandates.length > 0 && (
        <section className="grid gap-3" aria-labelledby="mandates">
          <h2 id="mandates" className="flex items-center gap-2 text-xl"><CalendarClock className="size-5 text-accent" aria-hidden /> {a.mandates}</h2>
          <ul className="grid gap-3">
            {mandates.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">
                    {formatINR(m.amount)}{t.donate.perMonth}, {lang === "en" ? m.campaign.titleEn : m.campaign.titleHi}
                    <span className={`badge ml-2 ${statusStyle[m.mandateStatus!]}`}>{statusLabel[m.mandateStatus!]}</span>
                  </p>
                  {m.mandateStatus === "ACTIVE" && m.nextChargeAt && (
                    <p className="text-[0.9rem] text-muted">{a.nextOn} {formatDate(m.nextChargeAt, lang)}</p>
                  )}
                </div>
                {m.mandateStatus !== "CANCELLED" && (
                  <form action={manageMandate} className="flex gap-2">
                    <input type="hidden" name="donationId" value={m.id} />
                    {m.mandateStatus === "ACTIVE" ? (
                      <button name="action" value="PAUSE" className="btn-secondary min-h-11"><Pause className="size-4" aria-hidden /> {a.pause}</button>
                    ) : (
                      <button name="action" value="RESUME" className="btn-secondary min-h-11"><Play className="size-4" aria-hidden /> {a.resume}</button>
                    )}
                    <ConfirmButton name="action" value="CANCEL" message={a.cancelConfirm} className="btn-ghost min-h-11 text-bad hover:bg-bad-soft">
                      <X className="size-4" aria-hidden /> {a.cancel}
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3" aria-labelledby="hist">
        <h2 id="hist" className="flex items-center gap-2 text-xl"><Receipt className="size-5 text-accent" aria-hidden /> {a.history}</h2>
        {donations.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <HandHeart className="size-8 text-accent" aria-hidden />
            <p>{a.empty}</p>
            <Link href="/donate" className="btn-primary">{a.first}</Link>
          </div>
        ) : (
          [...byFy.entries()].map(([year, list]) => (
            <div key={year} className="grid gap-2">
              <h3 className="text-[0.95rem] font-semibold text-muted">FY {year}</h3>
              <ul className="card divide-y divide-line">
                {list.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold">
                        {formatINR(d.amount)}, {lang === "en" ? d.campaign.titleEn : d.campaign.titleHi}
                        {d.frequency === "MONTHLY" && <span className="badge ml-2 bg-accent-soft text-accent-strong">{a.monthlyBadge}</span>}
                        {d.receipt?.cancelledAt && <span className="badge ml-2 bg-bad-soft text-bad">{a.cancelled}</span>}
                      </p>
                      <p className="text-[0.9rem] text-muted">{formatDate(d.createdAt, lang)}<br />{d.receipt?.number}</p>
                    </div>
                    {d.receipt && (
                      <a href={`/api/receipts/${d.id}`} target="_blank" rel="noopener" className="btn-secondary min-h-11">
                        <Download className="size-4" aria-hidden /> 80G PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
