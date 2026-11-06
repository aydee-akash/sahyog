import Link from "next/link";
import { prisma } from "@/lib/db";
import { DISTRICTS, NEEDS, districtHi } from "@/lib/content";
import { SchemeCard } from "@/components/SchemeCard";
import { ArrowIcon, NeedIcon } from "@/components/icons";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

type Search = Promise<{ need?: string; district?: string }>;

export default async function Home({ searchParams }: { searchParams: Search }) {
  const { need, district } = await searchParams;
  const validNeed = NEEDS.some((n) => n.key === need) ? need : undefined;
  const validDistrict = DISTRICTS.some((d) => d.key === district) ? district : undefined;

  const [schemes, campaigns] = await Promise.all([
    prisma.scheme.findMany({
      where: {
        status: "PUBLISHED",
        ...(validNeed ? { need: validNeed } : {}),
        ...(validDistrict ? { OR: [{ districts: { isEmpty: true } }, { districts: { has: validDistrict } }] } : {}),
      },
      orderBy: { code: "asc" },
      select: { code: true, titleHi: true, benefitHi: true, need: true, summaryHi: true },
    }),
    prisma.campaign.findMany({ where: { active: true }, orderBy: { slug: "asc" } }),
  ]);
  const raised = await prisma.donation.groupBy({ by: ["campaignId"], where: { status: "PAID" }, _sum: { amount: true } });
  const raisedBy = Object.fromEntries(raised.map((r) => [r.campaignId, r._sum.amount ?? 0]));

  const link = (n?: string) => {
    const p = new URLSearchParams();
    if (n) p.set("need", n);
    if (validDistrict) p.set("district", validDistrict);
    const q = p.toString();
    return q ? `/?${q}#schemes` : "/#schemes";
  };

  return (
    <div className="grid gap-12">
      <section className="grid gap-5 pt-2">
        <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.4rem]">
          आपके लिए सरकारी योजनाएँ,
          <br />
          <span className="text-accent">आसान हिंदी में</span>
        </h1>
        <p className="max-w-xl text-lg text-muted">
          पेंशन, लोन, मातृत्व सहायता और बहुत कुछ। देखें कि कौन सी योजना आपके काम की है और आवेदन कैसे करें।
        </p>
        <Link href="/finder" className="card flex items-center justify-between gap-4 border-accent/40 bg-accent-soft p-5 hover:border-accent">
          <span>
            <span className="block text-xl font-bold text-accent-strong">मेरे लिए कौन सी योजना है?</span>
            <span className="text-muted">6 आसान सवालों के जवाब दें · 1 मिनट</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white">
            <ArrowIcon />
          </span>
        </Link>
      </section>

      <section id="schemes" aria-labelledby="schemes-h" className="grid gap-5 scroll-mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="schemes-h" className="text-2xl font-bold">
            ज़रूरत के हिसाब से देखें
          </h2>
          <form className="flex items-center gap-2" action="/#schemes">
            {validNeed && <input type="hidden" name="need" value={validNeed} />}
            <label htmlFor="district" className="text-[0.95rem] text-muted">ज़िला</label>
            <select id="district" name="district" defaultValue={validDistrict ?? ""} className="input min-h-11 w-auto py-1">
              <option value="">सभी ज़िले</option>
              {DISTRICTS.map((d) => (
                <option key={d.key} value={d.key}>{d.hi}</option>
              ))}
            </select>
            <button className="btn-secondary min-h-11 px-4">देखें</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2" role="list" aria-label="ज़रूरत">
          <Link role="listitem" href={link()} className={`chip ${!validNeed ? "chip-on" : ""}`} aria-current={!validNeed ? "true" : undefined}>
            सभी
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
              {n.hi}
            </Link>
          ))}
        </div>

        {schemes.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <p className="text-lg font-semibold">
              {validDistrict ? `${districtHi(validDistrict)} में इस ज़रूरत की कोई योजना अभी हमारी सूची में नहीं है।` : "इस ज़रूरत की कोई योजना अभी सूची में नहीं है।"}
            </p>
            <p className="text-muted">दूसरी ज़रूरत चुनें या हेल्पलाइन पर पूछें। हम नई योजनाएँ जोड़ते रहते हैं।</p>
            <Link href="/#schemes" className="btn-secondary">सभी योजनाएँ देखें</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schemes.map((s) => (
              <SchemeCard key={s.code} {...s} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="give-h" className="grid gap-5 border-t border-line pt-10">
        <div>
          <h2 id="give-h" className="text-2xl font-bold">ट्रस्ट के काम में साथ दें</h2>
          <p className="text-muted">दान पर तुरंत रसीद और 80G प्रमाण पत्र। हर महीने दान भी कर सकते हैं।</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const pct = Math.min(100, Math.round(((raisedBy[c.id] ?? 0) / c.goal) * 100));
            return (
              <Link key={c.id} href={`/donate/${c.slug}`} className="card grid gap-3 p-5 hover:border-accent">
                <h3 className="text-xl font-bold">{c.titleHi}</h3>
                <p className="text-muted">{c.blurbHi}</p>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="लक्ष्य की प्रगति">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <p className="mt-1 text-[0.9rem] text-muted">
                    {formatINR(raisedBy[c.id] ?? 0)} जुटे · लक्ष्य {formatINR(c.goal)}
                  </p>
                </div>
                <span className="btn-primary justify-self-start">दान करें</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
