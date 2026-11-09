import Link from "next/link";
import { Download, FileText, HandHeart, Pause, Play, X } from "lucide-react";
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
  const [donations, mandates, campaigns] = await Promise.all([
    prisma.donation.findMany({
      where: { userId: session.userId, status: "PAID" },
      include: { receipt: true, campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.donation.findMany({
      where: { userId: session.userId, frequency: "MONTHLY", parentId: null, status: "PAID", mandateStatus: { in: ["ACTIVE", "PAUSED"] } },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.findMany({ where: { active: true }, orderBy: { slug: "asc" } }),
  ]);

  const now = new Date();
  const currentFy = financialYear(now);
  const valid = (d: (typeof donations)[number]) => !d.receipt?.cancelledAt;
  const byFy = new Map<string, typeof donations>();
  for (const d of donations) {
    const k = d.receipt?.fy ?? currentFy;
    byFy.set(k, [...(byFy.get(k) ?? []), d]);
  }
  const fyList = [...byFy.keys()].sort().reverse();
  // The year shown up top: this financial year, or the latest year with gifts.
  const heroFy = byFy.has(currentFy) ? currentFy : (fyList[0] ?? currentFy);
  const heroRows = (byFy.get(heroFy) ?? []).filter(valid);
  const heroTotal = heroRows.reduce((s, d) => s + d.amount, 0);
  const title = (c: { titleHi: string; titleEn: string }) => (lang === "en" ? c.titleEn : c.titleHi);

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-10">
      <header className="grid gap-1">
        <h1 className="text-[2.1rem] leading-tight">{a.hello(session.name.split(" ")[0])}</h1>
        <p className="text-muted">{a.leadFull}</p>
      </header>

      <section aria-labelledby="year-h" className="grid gap-4 rounded-[1.25rem] bg-accent p-6 text-white sm:p-7">
        <h2 id="year-h" className="font-[family-name:var(--font-sans)] text-[1rem] font-semibold text-white/80">{a.fy(heroFy)}</h2>
        {heroRows.length ? (
          <>
            <p className="font-[family-name:var(--font-display)] text-[2.8rem] font-semibold leading-none">{formatINR(heroTotal)}</p>
            <p className="text-white/85">{a.receipts(heroRows.length)}</p>
            <div className="grid gap-1.5">
              <a href={`/api/receipts/statement?fy=${heroFy}`} target="_blank" rel="noopener" className="btn justify-self-start bg-white text-accent hover:bg-accent-soft">
                <Download className="size-5" aria-hidden /> {a.statement}
              </a>
              <p className="text-[0.9rem] text-white/75">{a.statementHint}</p>
            </div>
          </>
        ) : (
          <div className="grid justify-items-start gap-3">
            <p className="text-lg">{a.nothingThisYear}</p>
            <Link prefetch={false} href="/donate" className="btn bg-white text-accent hover:bg-accent-soft">{a.first}</Link>
          </div>
        )}
      </section>

      {mandates.length > 0 && (
        <section aria-labelledby="monthly-h" className="grid gap-3">
          <h2 id="monthly-h" className="text-[1.4rem]">{a.monthly}</h2>
          <ul className="grid gap-3">
            {mandates.map((m) => {
              const overdue = m.mandateStatus === "ACTIVE" && m.nextChargeAt && m.nextChargeAt < now;
              return (
                <li key={m.id} className="grid gap-3 rounded-xl bg-paper p-4 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {formatINR(m.amount)}{t.donate.perMonth}, {title(m.campaign)}
                      <span className={`badge ml-2 ${m.mandateStatus === "ACTIVE" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
                        {m.mandateStatus === "ACTIVE" ? a.statusActive : a.statusPaused}
                      </span>
                    </p>
                    {m.mandateStatus === "ACTIVE" && m.nextChargeAt && (
                      <p className="text-[0.95rem] text-muted">{overdue ? a.dueNow : `${a.nextOn} ${formatDate(m.nextChargeAt, lang)}`}</p>
                    )}
                  </div>
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
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="hist" className="grid gap-4">
        <h2 id="hist" className="text-[1.4rem]">{a.history}</h2>
        {donations.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-xl bg-paper p-6">
            <HandHeart className="size-8 text-accent" aria-hidden />
            <p>{a.empty}</p>
            <Link prefetch={false} href="/donate" className="btn-primary">{a.first}</Link>
          </div>
        ) : (
          fyList.map((year) => {
            const list = byFy.get(year)!;
            const total = list.filter(valid).reduce((s, d) => s + d.amount, 0);
            return (
              <div key={year} className="grid gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-1.5">
                  <h3 className="text-[1.1rem]">{a.fy(year)}</h3>
                  <span className="flex items-baseline gap-3 text-[0.95rem]">
                    <strong>{a.yearTotal(formatINR(total))}</strong>
                    {year !== heroFy && (
                      <a href={`/api/receipts/statement?fy=${year}`} target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-4">
                        {a.statement}
                      </a>
                    )}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {list.map((d) => (
                    <li key={d.id} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 py-3 ${d.receipt?.cancelledAt ? "opacity-60" : ""}`}>
                      <p className="font-semibold">
                        {title(d.campaign)}
                        {d.frequency === "MONTHLY" && <span className="badge ml-2 bg-accent-soft text-accent">{a.monthlyBadge}</span>}
                        {d.receipt?.cancelledAt && <span className="badge ml-2 bg-bad-soft text-bad">{a.cancelled}</span>}
                      </p>
                      <p className={`text-right font-[family-name:var(--font-display)] text-[1.15rem] font-semibold ${d.receipt?.cancelledAt ? "line-through" : ""}`}>
                        {formatINR(d.amount)}
                      </p>
                      <p className="text-[0.9rem] text-muted">
                        {formatDate(d.createdAt, lang)}
                        <span className="block tabular-nums sm:inline sm:pl-3">{d.receipt?.number}</span>
                      </p>
                      {d.receipt && (
                        <a
                          href={`/api/receipts/${d.id}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex min-h-11 items-center gap-1.5 justify-self-end rounded-lg px-2 text-[0.95rem] font-semibold text-accent hover:bg-accent-soft"
                          aria-label={`${a.receiptPdf} ${d.receipt.number} (PDF)`}
                        >
                          <FileText className="size-4" aria-hidden /> {a.receiptPdf}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {campaigns.length > 0 && (
        <section aria-labelledby="again-h" className="grid gap-3 border-t border-line pt-8">
          <h2 id="again-h" className="text-[1.4rem]">{a.giveAgain}</h2>
          <p className="text-muted">{a.giveAgainLead}</p>
          <div className="flex flex-wrap gap-2">
            {campaigns.map((c) => (
              <Link prefetch={false} key={c.id} href={`/donate/${c.slug}`} className="btn-secondary">{title(c)}</Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
