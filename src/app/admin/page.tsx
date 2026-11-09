import Link from "next/link";
import { BookOpenText, CalendarClock, HandCoins, PhoneCall, ReceiptIndianRupee, Search, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { financialYear } from "@/lib/fy";
import { formatINR } from "@/lib/money";
import { RunMonthly } from "./RunMonthly";

export const metadata = { title: "डैशबोर्ड | एडमिन" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function Dashboard() {
  const now = new Date();
  const fy = financialYear(now);
  const since14 = new Date(now.getTime() - 13 * DAY);
  since14.setHours(0, 0, 0, 0);
  const since30 = new Date(now.getTime() - 30 * DAY);

  const [fyAgg, recent, activeMandates, dueMandates, openCallbacks, inReview, finder, finderVia, donorsFy, log] = await Promise.all([
    prisma.receipt.findMany({ where: { fy, cancelledAt: null }, select: { donation: { select: { amount: true } } } }),
    prisma.donation.findMany({ where: { status: "PAID", createdAt: { gte: since14 } }, select: { amount: true, createdAt: true } }),
    prisma.donation.aggregate({ where: { mandateStatus: "ACTIVE", parentId: null }, _count: true, _sum: { amount: true } }),
    prisma.donation.count({ where: { mandateStatus: "ACTIVE", parentId: null, nextChargeAt: { lte: now } } }),
    prisma.callbackRequest.count({ where: { handled: false } }),
    prisma.scheme.count({ where: { status: "IN_REVIEW" } }),
    prisma.finderUse.count({ where: { createdAt: { gte: since30 } } }),
    prisma.finderUse.groupBy({ by: ["via"], where: { createdAt: { gte: since30 } }, _count: true }),
    prisma.donation.findMany({ where: { status: "PAID", receipt: { fy } }, distinct: ["donorPan"], select: { donorPan: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const fyTotal = fyAgg.reduce((s, r) => s + r.donation.amount, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14.getTime() + i * DAY);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("hi-IN", { day: "numeric", month: "short" }), total: 0, count: 0 };
  });
  for (const r of recent) {
    const k = r.createdAt.toISOString().slice(0, 10);
    const day = days.find((d) => d.key === k);
    if (day) {
      day.total += r.amount;
      day.count += 1;
    }
  }
  const max = Math.max(1, ...days.map((d) => d.total));
  const viaLabel: Record<string, string> = { QUESTIONS: "सवालों से", AI_TEXT: "AI (लिखकर)", VOICE: "AI (बोलकर)" };

  const kpis = [
    { label: `इस वित्त वर्ष (${fy})`, value: formatINR(fyTotal), sub: `${fyAgg.length} रसीदें`, Icon: ReceiptIndianRupee, href: "/admin/donations" },
    { label: "दानदाता (PAN)", value: String(donorsFy.length), sub: "इस वित्त वर्ष", Icon: Users, href: "/admin/donations" },
    { label: "चालू मासिक दान", value: String(activeMandates._count), sub: `${formatINR(activeMandates._sum.amount ?? 0)} / महीना`, Icon: CalendarClock, href: "/admin/donations" },
    { label: "खोजक उपयोग (30 दिन)", value: String(finder), sub: "लक्ष्य: साल में 50,000", Icon: Search, href: "/admin" },
    { label: "बाकी कॉल-बैक", value: String(openCallbacks), sub: "हेल्पलाइन टीम के लिए", Icon: PhoneCall, href: "/admin/callbacks" },
    { label: "समीक्षा में योजनाएँ", value: String(inReview), sub: "स्वीकृति बाकी", Icon: BookOpenText, href: "/admin/schemes" },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[1.75rem]">डैशबोर्ड</h1>
        <p className="text-muted">हर रसीद, 80G प्रमाण पत्र और रिमाइंडर अपने-आप बनता है।</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {kpis.map(({ label, value, sub, Icon, href }) => (
          <Link prefetch={false} key={label} href={href} className="card grid gap-1 p-4 transition-colors hover:border-accent">
            <span className="flex items-center gap-2 text-[0.9rem] text-muted"><Icon className="size-4 text-accent" aria-hidden /> {label}</span>
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-[0.85rem] text-muted">{sub}</span>
          </Link>
        ))}
      </div>

      <section className="card grid gap-4 p-5" aria-labelledby="chart-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chart-h" className="text-lg">पिछले 14 दिन का दान</h2>
          <span className="text-[0.9rem] text-muted">{formatINR(days.reduce((s, d) => s + d.total, 0))}, {days.reduce((s, d) => s + d.count, 0)} दान</span>
        </div>
        <div className="flex h-44 items-end gap-1.5" role="img" aria-label="पिछले 14 दिन के दान का बार चार्ट">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="rounded-t-md bg-accent/80 transition-colors group-hover:bg-accent"
                style={{ height: `${d.total ? Math.max(4, (d.total / max) * 100) : 1.5}%` }}
                title={`${d.label}: ${formatINR(d.total)} (${d.count})`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[0.75rem] text-muted" aria-hidden>
          <span>{days[0].label}</span>
          <span>{days[6].label}</span>
          <span>{days[13].label}</span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card grid content-start gap-3 p-5" aria-labelledby="monthly-h">
          <h2 id="monthly-h" className="flex items-center gap-2 text-lg"><HandCoins className="size-5 text-accent" aria-hidden /> मासिक दान चलाएँ (टेस्ट)</h2>
          <p className="text-muted">
            असली सिस्टम में यह रोज़ अपने-आप चलता है। अभी {dueMandates} मासिक दान की किस्त बाकी है। हर किस्त की नई रसीद और ईमेल बनेगा; दोबारा चलाने पर दोहरा चार्ज नहीं होगा।
          </p>
          <RunMonthly due={dueMandates} />
        </section>

        <section className="card grid content-start gap-3 p-5" aria-labelledby="finder-h">
          <h2 id="finder-h" className="flex items-center gap-2 text-lg"><Search className="size-5 text-accent" aria-hidden /> खोजक कैसे इस्तेमाल हुआ (30 दिन)</h2>
          {finderVia.length === 0 ? (
            <p className="text-muted">अभी कोई उपयोग नहीं।</p>
          ) : (
            <ul className="grid gap-2">
              {finderVia.map((v) => (
                <li key={v.via} className="grid gap-1">
                  <span className="flex justify-between text-[0.95rem]"><span>{viaLabel[v.via] ?? v.via}</span><strong>{v._count}</strong></span>
                  <span className="h-2 overflow-hidden rounded-full bg-paper ring-1 ring-line">
                    <span className="block h-full rounded-full bg-haldi" style={{ width: `${(v._count / finder) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.85rem] text-muted">केवल गिनती रखी जाती है, महिलाओं के जवाब नहीं।</p>
        </section>
      </div>

      <section className="grid gap-2" aria-labelledby="log-h">
        <h2 id="log-h" className="text-lg">हाल की गतिविधि</h2>
        <ul className="card divide-y divide-line text-[0.9rem]">
          {log.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
              <span><strong>{l.action}</strong> ({l.entity}){l.detail ? `: ${l.detail}` : ""}</span>
              <span className="text-muted">{l.actor}, {l.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
