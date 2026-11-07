import Link from "next/link";
import { ListChecks, MapPin, PhoneCall, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/lang";
import { DISTRICTS, NEEDS, districtLabel, pick } from "@/lib/content";
import { SchemeCard } from "@/components/SchemeCard";
import { AskBox } from "@/components/AskBox";
import { ArrowIcon, NeedIcon } from "@/components/icons";
import { formatINR } from "@/lib/money";
import { TRUST } from "@/lib/trust";

export const dynamic = "force-dynamic";

type Search = Promise<{ need?: string; district?: string }>;

export default async function Home({ searchParams }: { searchParams: Search }) {
  const [{ need, district }, { lang, t }] = await Promise.all([searchParams, getT()]);
  const validNeed = NEEDS.some((n) => n.key === need) ? need : undefined;
  const validDistrict = DISTRICTS.some((d) => d.key === district) ? district : undefined;

  const [schemes, publishedCount, campaigns, raised] = await Promise.all([
    prisma.scheme.findMany({
      where: {
        status: "PUBLISHED",
        ...(validNeed ? { need: validNeed } : {}),
        ...(validDistrict ? { OR: [{ districts: { isEmpty: true } }, { districts: { has: validDistrict } }] } : {}),
      },
      orderBy: { code: "asc" },
    }),
    prisma.scheme.count({ where: { status: "PUBLISHED" } }),
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
    <div className="grid gap-14">
      <section className="grid items-start gap-8 pt-2 md:grid-cols-[1.1fr_1fr] md:pt-8">
        <div className="grid gap-4">
          <p className="inline-flex items-center gap-2 text-[0.95rem] font-semibold text-accent">
            <MapPin className="size-4" aria-hidden /> {t.home.eyebrow}
          </p>
          <h1 className="text-[2.1rem] font-bold leading-[1.15] sm:text-[2.6rem]">
            {t.home.title1}
            <br />
            <span className="text-accent">{t.home.title2}</span>
          </h1>
          <p className="max-w-xl text-lg text-muted">{t.home.lead}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem] text-muted">
            <li><strong className="text-ink">{DISTRICTS.length}</strong> {t.home.stats.districts}</li>
            <li><strong className="text-ink">{publishedCount}</strong> {t.home.stats.schemes}</li>
            <li className="inline-flex items-center gap-1"><ShieldCheck className="size-4 text-ok" aria-hidden /> {t.home.stats.free}</li>
          </ul>
        </div>
        <div className="grid gap-3">
          <AskBox lang={lang} />
          <Link href="/finder" className="btn-ghost justify-self-start px-2">
            <ListChecks className="size-5" aria-hidden /> {t.home.orQuestions} <ArrowIcon className="size-4" />
          </Link>
        </div>
      </section>

      <section id="schemes" aria-labelledby="schemes-h" className="grid scroll-mt-20 gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="schemes-h" className="text-2xl font-bold">{t.home.byNeed}</h2>
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

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="list" aria-label={t.home.byNeed}>
          <Link role="listitem" href={link()} className={`chip justify-center sm:justify-start ${!validNeed ? "chip-on" : ""}`} aria-current={!validNeed ? "true" : undefined}>
            {t.home.all}
          </Link>
          {NEEDS.map((n) => (
            <Link
              role="listitem"
              key={n.key}
              href={link(n.key)}
              className={`chip justify-center sm:justify-start ${validNeed === n.key ? "chip-on" : ""}`}
              aria-current={validNeed === n.key ? "true" : undefined}
            >
              <NeedIcon need={n.key} className="size-5" />
              {n[lang]}
            </Link>
          ))}
        </div>

        {schemes.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <p className="text-lg font-semibold">{validDistrict ? t.home.emptyIn(districtLabel(validDistrict, lang)) : t.home.empty}</p>
            <p className="text-muted">{t.home.emptyHint}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/#schemes" className="btn-secondary">{t.home.seeAll}</Link>
              <a href={`tel:${TRUST.helpline.replace(/\D/g, "")}`} className="btn-ghost"><PhoneCall className="size-5" aria-hidden /> {TRUST.helpline}</a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schemes.map((s) => (
              <SchemeCard
                key={s.code}
                code={s.code}
                need={s.need}
                lang={lang}
                title={lang === "en" ? s.titleEn : s.titleHi}
                benefit={pick(lang, s.benefitHi, s.benefitEn)}
                summary={pick(lang, s.summaryHi, s.summaryEn)}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="give-h" className="grid gap-5 border-t border-line pt-10">
        <div>
          <h2 id="give-h" className="text-2xl font-bold">{t.home.giveTitle}</h2>
          <p className="text-muted">{t.home.giveLead}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const sum = raisedBy[c.id]?._sum.amount ?? 0;
            const pct = Math.min(100, Math.round((sum / c.goal) * 100));
            return (
              <Link key={c.id} href={`/donate/${c.slug}`} className="card grid gap-3 p-5 transition-colors hover:border-accent">
                <h3 className="text-xl font-bold">{lang === "en" ? c.titleEn : c.titleHi}</h3>
                <p className="text-muted">{pick(lang, c.blurbHi, c.blurbEn)}</p>
                <div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t.home.progress}>
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-orange-600" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap justify-between gap-2 text-[0.9rem] text-muted">
                    <span><strong className="text-ink">{formatINR(sum)}</strong> {t.home.raised} · {raisedBy[c.id]?._count ?? 0} {t.home.donors}</span>
                    <span>{t.home.goal} {formatINR(c.goal)}</span>
                  </p>
                </div>
                <span className="btn-primary justify-self-start">{t.nav.donate}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
