import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { DISTRICTS, districtHi, formatDateHi, needHi } from "@/lib/content";
import { NeedIcon, PhoneIcon } from "@/components/icons";
import { TRUST } from "@/lib/trust";

type Params = Promise<{ code: string }>;
type Search = Promise<{ district?: string }>;

async function getScheme(code: string) {
  return prisma.scheme.findFirst({ where: { code, status: "PUBLISHED" } });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = await getScheme((await params).code);
  return { title: s?.titleHi ?? "योजना" };
}

export default async function SchemePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { code } = await params;
  const { district } = await searchParams;
  const scheme = await getScheme(code);
  if (!scheme) notFound();

  const chosen = DISTRICTS.some((d) => d.key === district) ? district! : undefined;
  const centre = chosen ? await prisma.helpCentre.findFirst({ where: { district: chosen } }) : null;
  const notInDistrict = chosen && scheme.districts.length > 0 && !scheme.districts.includes(chosen);

  return (
    <article className="mx-auto grid max-w-2xl gap-8">
      <div className="grid gap-3">
        <Link href={`/?need=${scheme.need}#schemes`} className="inline-flex items-center gap-2 text-[0.95rem] text-accent">
          <NeedIcon need={scheme.need} className="size-5" /> {needHi(scheme.need)}
        </Link>
        <h1 className="text-[2rem] font-bold leading-tight">{scheme.titleHi}</h1>
        <p className="text-lg text-muted">{scheme.summaryHi}</p>
        <div className="card mt-2 border-accent/40 bg-accent-soft p-5">
          <p className="text-[0.95rem] text-muted">क्या मिल सकता है</p>
          <p className="text-2xl font-bold text-accent-strong">{scheme.benefitHi}</p>
        </div>
      </div>

      <section aria-labelledby="who" className="grid gap-2">
        <h2 id="who" className="text-xl font-bold">कौन आवेदन कर सकती है</h2>
        <p>{scheme.eligibilityHi}</p>
        {scheme.districts.length > 0 && (
          <p className="text-muted">केवल इन ज़िलों में: {scheme.districts.map(districtHi).join(", ")}</p>
        )}
      </section>

      <section aria-labelledby="docs" className="grid gap-2">
        <h2 id="docs" className="text-xl font-bold">ज़रूरी कागज़</h2>
        <ul className="grid gap-2">
          {scheme.documentsHi.map((d) => (
            <li key={d} className="flex gap-3">
              <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-accent" />
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="grid gap-2">
        <h2 id="how" className="text-xl font-bold">आवेदन कैसे करें</h2>
        <p>{scheme.howToApplyHi}</p>
      </section>

      <section aria-labelledby="help" className="card grid gap-4 p-5">
        <h2 id="help" className="text-xl font-bold">नज़दीकी सहायता केंद्र</h2>
        <form className="flex flex-wrap items-center gap-2">
          <label htmlFor="district" className="sr-only">अपना ज़िला चुनें</label>
          <select id="district" name="district" defaultValue={chosen ?? ""} className="input w-auto">
            <option value="" disabled>अपना ज़िला चुनें</option>
            {DISTRICTS.map((d) => (
              <option key={d.key} value={d.key}>{d.hi}</option>
            ))}
          </select>
          <button className="btn-secondary">केंद्र देखें</button>
        </form>
        {notInDistrict && (
          <p className="rounded-xl bg-warn-soft p-3 text-warn">यह योजना {districtHi(chosen!)} में लागू नहीं है। फिर भी केंद्र पर दूसरी योजनाओं के बारे में पूछ सकती हैं।</p>
        )}
        {centre ? (
          <div className="grid gap-1">
            <p className="font-semibold">{centre.name}</p>
            <p className="text-muted">{centre.address}</p>
            <a href={`tel:${centre.phone.replace(/\D/g, "")}`} className="btn-primary mt-2 justify-self-start">
              <PhoneIcon /> {centre.phone}
            </a>
          </div>
        ) : (
          <p className="text-muted">ज़िला चुनें, या हेल्पलाइन पर कॉल करें: <a className="font-semibold text-accent" href={`tel:${TRUST.helpline.replace(/\D/g, "")}`}>{TRUST.helpline}</a></p>
        )}
      </section>

      <footer className="grid gap-1 border-t border-line pt-4 text-[0.9rem] text-muted">
        <p>
          आधिकारिक सूचना:{" "}
          <a href={scheme.sourceUrl} className="text-accent underline" rel="noopener noreferrer" target="_blank">
            स्रोत देखें
          </a>
        </p>
        <p>आखिरी बार जाँचा गया: {formatDateHi(scheme.lastChecked)}</p>
        <p>यह सरल हिंदी सारांश है। नियम बदल सकते हैं, आवेदन से पहले विभाग से पुष्टि करें।</p>
      </footer>
    </article>
  );
}
