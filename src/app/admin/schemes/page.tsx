import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { STATUS_HI, formatDateHi, needHi } from "@/lib/content";

export const metadata = { title: "योजनाएँ · एडमिन" };

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-line text-ink",
  IN_REVIEW: "bg-warn-soft text-warn",
  PUBLISHED: "bg-ok-soft text-ok",
};

export default async function AdminSchemes() {
  await requireAdmin();
  const schemes = await prisma.scheme.findMany({ orderBy: [{ status: "asc" }, { code: "asc" }] });
  const stale = (d: Date) => Date.now() - d.getTime() > 90 * 86_400_000;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-bold">योजनाएँ</h1>
          <p className="text-muted">केवल &ldquo;प्रकाशित&rdquo; योजनाएँ होम पेज पर दिखती हैं। हर बदलाव समीक्षा के बाद ही प्रकाशित होता है।</p>
        </div>
        <Link prefetch={false} href="/admin/schemes/new" className="btn-primary">+ नई योजना</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-line text-[0.9rem] text-muted">
            <tr>
              <th className="p-3 font-semibold">कोड</th>
              <th className="p-3 font-semibold">योजना</th>
              <th className="p-3 font-semibold">ज़रूरत</th>
              <th className="p-3 font-semibold">स्थिति</th>
              <th className="p-3 font-semibold">आखिरी जाँच</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schemes.map((s) => (
              <tr key={s.id} className="hover:bg-paper">
                <td className="p-3 text-[0.9rem] text-muted">{s.code}</td>
                <td className="p-3">
                  <Link prefetch={false} href={`/admin/schemes/${s.id}`} className="font-semibold text-accent hover:underline">{s.titleHi}</Link>
                  <span className="block text-[0.85rem] text-muted">{s.titleEn}</span>
                </td>
                <td className="p-3">{needHi(s.need)}</td>
                <td className="p-3">
                  <span className={`badge ${STATUS_STYLE[s.status]}`}>{STATUS_HI[s.status]}</span>
                  {s.aiDrafted && s.status !== "PUBLISHED" && <span className="badge ml-1 bg-accent-soft text-accent-strong">AI ड्राफ़्ट</span>}
                </td>
                <td className={`p-3 text-[0.9rem] ${stale(s.lastChecked) ? "font-semibold text-bad" : ""}`}>
                  {formatDateHi(s.lastChecked)}
                  {stale(s.lastChecked) && <span className="block">90 दिन से पुरानी</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
