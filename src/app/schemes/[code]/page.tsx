import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, FileText, ListChecks, MapPin, MessageCircle, Route, UsersRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/lang";
import { DISTRICTS, districtLabel, formatDate, needLabel, pick } from "@/lib/content";
import { NeedIcon, PhoneIcon } from "@/components/icons";
import { ListenButton } from "@/components/ListenButton";
import { TRUST } from "@/lib/trust";

type Params = Promise<{ code: string }>;
type Search = Promise<{ district?: string }>;

async function getScheme(code: string) {
  return prisma.scheme.findFirst({ where: { code, status: "PUBLISHED" } });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [s, { lang }] = await Promise.all([getScheme((await params).code), getT()]);
  return { title: s ? (lang === "en" ? s.titleEn : s.titleHi) : "योजना" };
}

export default async function SchemePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ code }, { district }, { lang, t }] = await Promise.all([params, searchParams, getT()]);
  const scheme = await getScheme(code);
  if (!scheme) notFound();

  const title = lang === "en" ? scheme.titleEn : scheme.titleHi;
  const summary = pick(lang, scheme.summaryHi, scheme.summaryEn);
  const benefit = pick(lang, scheme.benefitHi, scheme.benefitEn);
  const eligibility = pick(lang, scheme.eligibilityHi, scheme.eligibilityEn);
  const documents = pick(lang, scheme.documentsHi, scheme.documentsEn);
  const howTo = pick(lang, scheme.howToApplyHi, scheme.howToApplyEn);

  const chosen = DISTRICTS.some((d) => d.key === district) ? district! : undefined;
  const centre = chosen ? await prisma.helpCentre.findFirst({ where: { district: chosen } }) : null;
  const notInDistrict = chosen && scheme.districts.length > 0 && !scheme.districts.includes(chosen);

  const spoken = [title, summary, `${t.scheme.mayGet}: ${benefit}`, `${t.scheme.who}: ${eligibility}`, `${t.scheme.docs}: ${documents.join(", ")}`, `${t.scheme.how}: ${howTo}`].join(". ");
  const share = `${title}\n${benefit}\n${t.scheme.who}: ${eligibility}\n\n${process.env.APP_URL ?? ""}/schemes/${scheme.code}`;

  const Section = ({ id, icon, heading, children }: { id: string; icon: React.ReactNode; heading: string; children: React.ReactNode }) => (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="flex items-center gap-2 text-[1.35rem]">
        <span className="text-accent">{icon}</span>
        {heading}
      </h2>
      {children}
    </section>
  );

  return (
    <article className="mx-auto grid max-w-2xl gap-8">
      <div className="grid gap-3">
        <Link prefetch={false} href={`/?need=${scheme.need}#schemes`} className="inline-flex items-center gap-2 text-[0.95rem] text-accent">
          <NeedIcon need={scheme.need} className="size-5" /> {needLabel(scheme.need, lang)}
        </Link>
        <h1 className="text-[2.1rem] leading-tight">{title}</h1>
        <p className="text-lg text-muted">{summary}</p>
        <div className="mt-2 rounded-xl bg-accent-soft p-5">
          <p className="text-[0.95rem] text-muted">{t.scheme.mayGet}</p>
          <p className="font-[family-name:var(--font-display)] text-[1.7rem] font-semibold leading-tight text-accent">{benefit}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ListenButton text={spoken} lang={lang} labels={{ listen: t.scheme.listen, stop: t.scheme.stop }} />
          <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <MessageCircle className="size-5" aria-hidden /> {t.scheme.share}
          </a>
        </div>
      </div>

      <Section id="who" icon={<UsersRound className="size-5" aria-hidden />} heading={t.scheme.who}>
        <p>{eligibility}</p>
        {scheme.districts.length > 0 && (
          <p className="text-muted">{t.scheme.onlyIn} {scheme.districts.map((d) => districtLabel(d, lang)).join(", ")}</p>
        )}
        <Link prefetch={false} href="/finder" className="btn-ghost justify-self-start px-2"><ListChecks className="size-5" aria-hidden /> {t.scheme.checkMine}</Link>
      </Section>

      <Section id="docs" icon={<FileText className="size-5" aria-hidden />} heading={t.scheme.docs}>
        <ul className="grid gap-2">
          {documents.map((d) => (
            <li key={d} className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
              <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-accent" />
              {d}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="how" icon={<Route className="size-5" aria-hidden />} heading={t.scheme.how}>
        <p>{howTo}</p>
      </Section>

      <section aria-labelledby="help" className="grid gap-4 rounded-xl bg-paper p-5">
        <h2 id="help" className="flex items-center gap-2 text-[1.35rem]"><MapPin className="size-5 text-accent" aria-hidden /> {t.scheme.help}</h2>
        <form className="flex flex-wrap items-center gap-2">
          <label htmlFor="district" className="sr-only">{t.scheme.chooseDistrict}</label>
          <select id="district" name="district" defaultValue={chosen ?? ""} className="input w-auto">
            <option value="" disabled>{t.scheme.chooseDistrict}</option>
            {DISTRICTS.map((d) => (
              <option key={d.key} value={d.key}>{d[lang]}</option>
            ))}
          </select>
          <button className="btn-secondary">{t.scheme.showCentre}</button>
        </form>
        {notInDistrict && <p className="rounded-xl bg-warn-soft p-3 text-warn">{t.scheme.notHere(districtLabel(chosen!, lang))}</p>}
        {centre ? (
          <div className="grid gap-1">
            <p className="font-semibold">{centre.name}</p>
            <p className="text-muted">{centre.address}</p>
            <a href={`tel:${centre.phone.replace(/\D/g, "")}`} className="btn-primary mt-2 justify-self-start">
              <PhoneIcon /> {centre.phone}
            </a>
          </div>
        ) : (
          <p className="text-muted">
            {t.scheme.orCall}{" "}
            <a className="font-semibold text-accent" href={`tel:${TRUST.helpline.replace(/\D/g, "")}`}>{TRUST.helpline}</a>
          </p>
        )}
      </section>

      <footer className="grid gap-1 border-t border-line pt-4 text-[0.9rem] text-muted">
        <p>
          {t.scheme.source}{" "}
          <a href={scheme.sourceUrl} className="inline-flex items-center gap-1 text-accent underline" rel="noopener noreferrer" target="_blank">
            {t.scheme.seeSource} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </p>
        <p>{t.scheme.lastChecked} {formatDate(scheme.lastChecked, lang)}</p>
        <p>{t.scheme.plain}</p>
      </footer>
    </article>
  );
}
