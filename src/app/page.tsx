import Link from "next/link";
import { ListChecks, PhoneCall } from "lucide-react";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/lang";
import { DISTRICTS, NEEDS, districtLabel, pick } from "@/lib/content";
import { SchemeRow } from "@/components/SchemeRow";
import { AskBox } from "@/components/AskBox";
import { NeedIcon } from "@/components/icons";
import { formatINR } from "@/lib/money";
import { TRUST } from "@/lib/trust";

export const dynamic = "force-dynamic";

type Search = Promise<{ need?: string; district?: string }>;

export default async function Home({ searchParams }: { searchParams: Search }) {
  const [{ need, district }, { lang, t }] = await Promise.all([searchParams, getT()]);
  const validNeed = NEEDS.some((n) => n.key === need) ? need : undefined;
  const validDistrict = DISTRICTS.some((d) => d.key === district) ? district : undefined;

  const [schemes, campaigns, raised] = await Promise.all([
    prisma.scheme.findMany({
      where: {
        status: "PUBLISHED",
        ...(validNeed ? { need: validNeed } : {}),
        ...(validDistrict ? { OR: [{ districts: { isEmpty: true } }, { districts: { has: validDistrict } }] } : {}),
      },
      orderBy: { code: "asc" },
    }),
    prisma.campaign.findMany({ where: { active: true }, orderBy: { slug: "asc" } }),
    prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
  ]);
  const raisedBy = Object.fromEntries(raised.map((r) => [r.campaignId, r]));

  const link = (n?: string) => {
    const p = new URLSearchParams();
    if (n) p.set("need", n);
    if (validDistrict) p.set("district", validDistrict);
    const q = p.toString();
    return q ? `/?${q}#schemes` : "/#schemes";
  };

  return (
    <div className="grid grid-cols-1 gap-16">
      <section className="grid items-center gap-8 pt-2 md:grid-cols-[1fr_1.05fr] md:gap-12 md:pt-10">
        <div className="grid gap-4">
          <h1 className="max-w-[14ch] text-[2.35rem] leading-[1.12] text-accent sm:text-[3rem]">{t.home.title}</h1>
          <p className="max-w-[46ch] text-lg text-muted">{t.home.lead}</p>
        </div>
        <div className="grid gap-2">
          <AskBox lang={lang} />
          <Link href="/finder" className="inline-flex min-h-11 items-center gap-2 justify-self-start px-1 font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
            <ListChecks className="size-5" aria-hidden /> {t.home.orQuestions}
          </Link>
        </div>
      </section>

      <section id="schemes" aria-labelledby="schemes-h" className="grid max-w-3xl scroll-mt-20 grid-cols-1 gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="schemes-h" className="text-[1.6rem]">{t.home.byNeed}</h2>
          <form className="flex items-center gap-2" action="/#schemes">
            {validNeed && <input type="hidden" name="need" value={validNeed} />}
            <label htmlFor="district" className="text-[0.95rem] text-muted">{t.home.district}</label>
            <select id="district" name="district" defaultValue={validDistrict ?? ""} className="input min-h-11 w-auto py-1">
              <option value="">{t.home.allDistricts}</option>
              {DISTRICTS.map((d) => (
                <option key={d.key} value={d.key}>{d[lang]}</option>
              ))}
            </select>
            <button className="btn-secondary min-h-11 px-4">{t.home.show}</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2" role="list" aria-label={t.home.byNeed}>
          <Link role="listitem" href={link()} className={`chip ${!validNeed ? "chip-on" : ""}`} aria-current={!validNeed ? "true" : undefined}>
            {t.home.all}
          </Link>
          {NEEDS.map((n) => (
            <Link
              role="listitem"
              key={n.key}
              href={link(n.key)}
              className={`chip ${validNeed === n.key ? "chip-on" : ""}`}
              aria-current={validNeed === n.key ? "true" : undefined}
            >
              <NeedIcon need={n.key} className="size-5" />
              {n[lang]}
            </Link>
          ))}
        </div>

        {schemes.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-xl bg-paper p-6">
            <p className="text-lg font-semibold">{validDistrict ? t.home.emptyIn(districtLabel(validDistrict, lang)) : t.home.empty}</p>
            <p className="text-muted">{t.home.emptyHint}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/#schemes" className="btn-secondary">{t.home.seeAll}</Link>
              <a href={`tel:${TRUST.helpline.replace(/\D/g, "")}`} className="btn-ghost"><PhoneCall className="size-5" aria-hidden /> {TRUST.helpline}</a>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[0.95rem] text-muted" aria-live="polite">{t.home.count(schemes.length)}</p>
            <ul className="divide-y divide-line border-y border-line">
              {schemes.map((s) => (
                <SchemeRow
                  key={s.code}
                  code={s.code}
                  need={s.need}
                  title={lang === "en" ? s.titleEn : s.titleHi}
                  benefit={pick(lang, s.benefitHi, s.benefitEn)}
                  summary={pick(lang, s.summaryHi, s.summaryEn)}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="give-h" className="grid gap-5 border-t border-line pt-10">
        <div className="max-w-2xl">
          <h2 id="give-h" className="text-[1.6rem]">{t.home.giveTitle}</h2>
          <p className="text-muted">{t.home.giveLead}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const sum = raisedBy[c.id]?._sum.amount ?? 0;
            const pct = Math.min(100, Math.round((sum / c.goal) * 100));
            return (
              <article key={c.id} className="grid content-start gap-3 rounded-xl border border-line p-5">
                <h3 className="text-[1.3rem]">{lang === "en" ? c.titleEn : c.titleHi}</h3>
                <p className="text-muted">{pick(lang, c.blurbHi, c.blurbEn)}</p>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t.home.progress}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <p className="mt-2 text-[0.95rem]">
                    <strong>{formatINR(sum)}</strong> {t.home.raised}, {raisedBy[c.id]?._count ?? 0} {t.home.donors}
                  </p>
                  <p className="text-[0.9rem] text-muted">{t.home.goal} {formatINR(c.goal)}</p>
                </div>
                <Link href={`/donate/${c.slug}`} className="btn-primary justify-self-start">{t.nav.donate}</Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
