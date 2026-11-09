import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate, needLabel } from "@/lib/content";
import { getT } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.schemes };
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-line text-ink",
  IN_REVIEW: "bg-warn-soft text-warn",
  PUBLISHED: "bg-ok-soft text-ok",
};

export default async function AdminSchemes() {
  await requireAdmin();
  const [schemes, { lang, t }] = await Promise.all([prisma.scheme.findMany({ orderBy: [{ status: "asc" }, { code: "asc" }] }), getT()]);
  const a = t.admin.schemes;
  const stale = (d: Date) => Date.now() - d.getTime() > 90 * 86_400_000;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem]">{a.title}</h1>
          <p className="text-muted">{a.lead}</p>
        </div>
        <Link prefetch={false} href="/admin/schemes/new" className="btn-primary">{a.new}</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-line text-[0.9rem] text-muted">
            <tr>
              <th className="p-3 font-semibold">{a.code}</th>
              <th className="p-3 font-semibold">{a.scheme}</th>
              <th className="p-3 font-semibold">{a.need}</th>
              <th className="p-3 font-semibold">{a.status}</th>
              <th className="p-3 font-semibold">{a.checked}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schemes.map((s) => (
              <tr key={s.id} className="hover:bg-paper">
                <td className="p-3 text-[0.9rem] text-muted">{s.code}</td>
                <td className="p-3">
                  <Link prefetch={false} href={`/admin/schemes/${s.id}`} className="font-semibold text-accent hover:underline">{lang === "en" ? s.titleEn : s.titleHi}</Link>
                  <span className="block text-[0.85rem] text-muted">{lang === "en" ? s.titleHi : s.titleEn}</span>
                </td>
                <td className="p-3">{needLabel(s.need, lang)}</td>
                <td className="p-3">
                  <span className={`badge ${STATUS_STYLE[s.status]}`}>{t.admin.status[s.status]}</span>
                  {s.aiDrafted && s.status !== "PUBLISHED" && <span className="badge ml-1 bg-accent-soft text-accent-strong">{a.aiDraft}</span>}
                </td>
                <td className={`p-3 text-[0.9rem] ${stale(s.lastChecked) ? "font-semibold text-bad" : ""}`}>
                  {formatDate(s.lastChecked, lang)}
                  {stale(s.lastChecked) && <span className="block">{a.stale}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
