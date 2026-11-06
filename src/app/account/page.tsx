import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { formatDateHi } from "@/lib/content";

export const metadata = { title: "मेरा खाता" };

export default async function Account() {
  const session = await requireUser("/account");
  const donations = await prisma.donation.findMany({
    where: { userId: session.userId, status: "PAID" },
    include: { receipt: true, campaign: true },
    orderBy: { createdAt: "desc" },
  });
  const total = donations.reduce((s, d) => s + d.amount, 0);
  const monthly = donations.filter((d) => d.frequency === "MONTHLY");

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-[2rem] font-bold">नमस्ते, {session.name.split(" ")[0]}</h1>
        <p className="text-muted">आपके दान और 80G प्रमाण पत्र</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-muted">कुल दान</p>
          <p className="text-2xl font-bold">{formatINR(total)}</p>
        </div>
        <div className="card p-5">
          <p className="text-muted">दान की संख्या</p>
          <p className="text-2xl font-bold">{donations.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-muted">मासिक दान</p>
          <p className="text-2xl font-bold">{monthly.length ? `${formatINR(monthly[0].amount)} / महीना` : "नहीं"}</p>
        </div>
      </div>

      <section className="grid gap-3" aria-labelledby="hist">
        <h2 id="hist" className="text-xl font-bold">दान का इतिहास</h2>
        {donations.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <p>आपने अभी तक कोई दान नहीं किया है।</p>
            <Link href="/donate" className="btn-primary">पहला दान करें</Link>
          </div>
        ) : (
          <ul className="card divide-y divide-line">
            {donations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">
                    {formatINR(d.amount)} · {d.campaign.titleHi}
                    {d.frequency === "MONTHLY" && <span className="badge ml-2 bg-accent-soft text-accent-strong">मासिक</span>}
                  </p>
                  <p className="text-[0.9rem] text-muted">{formatDateHi(d.createdAt)} · {d.receipt?.number}</p>
                </div>
                {d.receipt && (
                  <a href={`/api/receipts/${d.id}`} target="_blank" rel="noopener" className="btn-secondary min-h-11">
                    80G PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
