import { CheckCircle2, PhoneCall, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { districtLabel } from "@/lib/content";
import { getT } from "@/lib/lang";
import { updateCallback } from "@/app/actions/admin";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.callbacks };
}

export default async function Callbacks({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const [{ show }, { lang, t }] = await Promise.all([searchParams, getT()]);
  const a = t.admin.callbacks;
  const done = show === "done";
  const [list, codes] = await Promise.all([
    prisma.callbackRequest.findMany({ where: { handled: done }, orderBy: { createdAt: done ? "desc" : "asc" }, take: 100 }),
    prisma.scheme.findMany({ select: { code: true, titleHi: true, titleEn: true } }),
  ]);
  const title = Object.fromEntries(codes.map((c) => [c.code, lang === "en" ? c.titleEn : c.titleHi]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[1.75rem]">{a.title}</h1>
        <p className="text-muted">{a.lead}</p>
      </div>
      <div className="flex gap-2">
        <a href="/admin/callbacks" className={`chip ${!done ? "chip-on" : ""}`}>{a.pending}</a>
        <a href="/admin/callbacks?show=done" className={`chip ${done ? "chip-on" : ""}`}>{a.done}</a>
      </div>
      {list.length === 0 ? (
        <div className="card grid justify-items-start gap-2 p-6">
          <CheckCircle2 className="size-8 text-ok" aria-hidden />
          <p className="font-semibold">{done ? a.emptyDone : a.emptyPending}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((c) => (
            <li key={c.id} className="card grid gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 text-lg font-bold text-accent">
                    <PhoneCall className="size-5" aria-hidden /> {c.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                  </a>
                  <p className="text-[0.9rem] text-muted">
                    {districtLabel(c.district, lang)}, {c.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                    {c.handledBy && `, ${c.handledBy}`}
                  </p>
                </div>
              </div>
              {c.schemeCodes.length > 0 && (
                <p className="flex flex-wrap gap-1.5">
                  {c.schemeCodes.map((s) => (
                    <span key={s} className="badge bg-accent-soft text-accent-strong">{title[s] ?? s}</span>
                  ))}
                </p>
              )}
              <form action={updateCallback} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="handled" value={done ? "false" : "true"} />
                <label className="grid min-w-56 flex-1 gap-1 text-[0.9rem]">
                  {a.note}
                  <input name="note" defaultValue={c.note} maxLength={500} className="input min-h-11" placeholder={a.placeholder} />
                </label>
                <button className={done ? "btn-secondary min-h-11" : "btn-primary min-h-11"}>
                  {done ? <><RotateCcw className="size-4" aria-hidden /> {a.reopen}</> : <><CheckCircle2 className="size-4" aria-hidden /> {a.markDone}</>}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
