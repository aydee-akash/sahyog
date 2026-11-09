"use client";

import { useId, useState } from "react";
import { useBusy } from "@/components/useBusy";
import type { SchemeStatus } from "@prisma/client";
import { generateDraft, saveScheme, transitionScheme } from "@/app/actions/admin";
import { DISTRICTS, NEEDS } from "@/lib/content";
import { DICTS, Lang } from "@/lib/i18n";
import type { Rules } from "@/lib/eligibility";

type Content = {
  titleHi: string;
  titleEn: string;
  need: string;
  districts: string[];
  summaryHi: string;
  benefitHi: string;
  eligibilityHi: string;
  documentsHi: string[];
  howToApplyHi: string;
  summaryEn: string;
  benefitEn: string;
  eligibilityEn: string;
  documentsEn: string[];
  howToApplyEn: string;
  sourceUrl: string;
  noticeText: string;
  lastChecked: string;
  rules: Rules;
  aiDrafted: boolean;
};

type Props = {
  lang: Lang;
  scheme: { id: string; code: string; status: SchemeStatus; reviewedBy: string | null; content: Content };
  log: { id: string; actor: string; action: string; at: string }[];
};

const MARITAL = ["MARRIED", "WIDOW", "SEPARATED", "UNMARRIED"] as const;

export function Editor({ lang, scheme, log }: Props) {
  const t = DICTS[lang].admin.editor;
  const statusLabel = DICTS[lang].admin.status;
  const [c, setC] = useState<Content>(scheme.content);
  const [docsText, setDocsText] = useState(scheme.content.documentsHi.join("\n"));
  const [docsEnText, setDocsEnText] = useState(scheme.content.documentsEn.join("\n"));
  const [tab, setTab] = useState<"hi" | "en">("hi");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [aiPending, startAi] = useBusy();
  const [pending, start] = useBusy();
  const status = scheme.status;

  const set = <K extends keyof Content>(k: K, v: Content[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };
  const setRule = <K extends keyof Rules>(k: K, v: Rules[K]) => set("rules", { ...c.rules, [k]: v });
  const toggle = <T extends string>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

  function payload() {
    const lines = (t: string) => t.split("\n").map((d) => d.trim()).filter(Boolean);
    return { ...c, documentsHi: lines(docsText), documentsEn: lines(docsEnText) };
  }

  function draft() {
    setMsg(null);
    startAi(async () => {
      const res = await generateDraft(scheme.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      const d = res.draft;
      setC((prev) => ({
        ...prev,
        summaryHi: d.summaryHi,
        benefitHi: d.benefitHi,
        eligibilityHi: d.eligibilityHi,
        howToApplyHi: d.howToApplyHi,
        summaryEn: d.summaryEn || prev.summaryEn,
        benefitEn: d.benefitEn || prev.benefitEn,
        eligibilityEn: d.eligibilityEn || prev.eligibilityEn,
        howToApplyEn: d.howToApplyEn || prev.howToApplyEn,
        aiDrafted: true,
      }));
      setDocsText(d.documentsHi.join("\n"));
      if (d.documentsEn.length) setDocsEnText(d.documentsEn.join("\n"));
      setNotFound(d.notFound);
      setDirty(true);
      setMsg({ kind: "warn", text: t.aiFilled });
    });
  }

  function save() {
    start(async () => {
      const res = await saveScheme(scheme.id, payload());
      if (!res.ok) return setMsg({ kind: "err", text: res.error });
      setDirty(false);
      setMsg({ kind: "ok", text: t.saved });
    });
  }

  function move(to: SchemeStatus) {
    start(async () => {
      const res = await transitionScheme(scheme.id, to);
      if (!res.ok) return setMsg({ kind: "err", text: res.error });
      setMsg({ kind: "ok", text: t.statusMsg(statusLabel[to]) });
    });
  }

  const readOnly = status !== "DRAFT";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.9rem] text-muted">{scheme.code}, {statusLabel[status]}{scheme.reviewedBy ? t.approvedBy(scheme.reviewedBy) : ""}</p>
          <h1 className="text-[1.75rem]">{lang === "en" ? c.titleEn : c.titleHi}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "DRAFT" && (
            <>
              <button onClick={save} disabled={pending || !dirty} className="btn-secondary">{t.save}</button>
              <button onClick={() => move("IN_REVIEW")} disabled={pending || dirty} className="btn-primary" title={dirty ? t.saveFirst : undefined}>
                {t.sendReview}
              </button>
            </>
          )}
          {status === "IN_REVIEW" && (
            <>
              <button onClick={() => move("DRAFT")} disabled={pending} className="btn-secondary">{t.backToDraft}</button>
              <button onClick={() => move("PUBLISHED")} disabled={pending} className="btn-primary">{t.approve}</button>
            </>
          )}
          {status === "PUBLISHED" && (
            <button onClick={() => move("DRAFT")} disabled={pending} className="btn-secondary">{t.unpublish}</button>
          )}
        </div>
      </div>

      {msg && (
        <p role="status" className={`rounded-xl p-3 ${msg.kind === "ok" ? "bg-ok-soft text-ok" : msg.kind === "warn" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
          {msg.text}
        </p>
      )}
      {readOnly && (
        <p className="rounded-xl bg-paper p-3 text-muted ring-1 ring-line">
          {status === "IN_REVIEW" ? t.inReview : t.published}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="notice-h" className="card grid content-start gap-3 p-5 lg:sticky lg:top-4 lg:self-start">
          <h2 id="notice-h" className="text-lg">{t.notice}</h2>
          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[0.9rem] text-accent underline">{c.sourceUrl}</a>
          <textarea
            value={c.noticeText}
            onChange={(e) => set("noticeText", e.target.value)}
            readOnly={readOnly}
            rows={12}
            className="input font-[system-ui] text-[0.9rem]"
            aria-label={t.noticeAria}
          />
          {status === "DRAFT" && (
            <button onClick={draft} disabled={aiPending} className="btn-primary">
              {aiPending ? t.aiRunning : t.aiButton}
            </button>
          )}
          {notFound.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-warn">
              <p className="font-semibold">{t.notFound}</p>
              <ul className="list-disc pl-5">{notFound.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </section>

        <fieldset disabled={readOnly} className="grid content-start gap-4">
          <legend className="sr-only">{t.legend}</legend>
          {c.aiDrafted && status !== "PUBLISHED" && (
            <p className="badge justify-self-start bg-accent-soft text-accent-strong">{t.aiBadge}</p>
          )}
          <Text label={t.titleHi} value={c.titleHi} onChange={(v) => set("titleHi", v)} />
          <Text label={t.titleEn} value={c.titleEn} onChange={(v) => set("titleEn", v)} />
          <div className="flex gap-1 rounded-xl bg-paper p-1 ring-1 ring-line" role="tablist" aria-label={t.langTabs}>
            {(["hi", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={tab === l}
                onClick={() => setTab(l)}
                className={`flex-1 rounded-lg py-2 font-semibold ${tab === l ? "bg-card text-accent-strong shadow-sm" : "text-muted"}`}
              >
                {l === "hi" ? t.tabHi : t.tabEn}
              </button>
            ))}
          </div>
          {tab === "hi" ? (
            <>
              <Text label={t.summaryHi} value={c.summaryHi} onChange={(v) => set("summaryHi", v)} rows={3} />
              <Text label={t.benefitHi} value={c.benefitHi} onChange={(v) => set("benefitHi", v)} />
              <Text label={t.eligibilityHi} value={c.eligibilityHi} onChange={(v) => set("eligibilityHi", v)} rows={2} />
              <Text label={t.docsHi} value={docsText} onChange={(v) => { setDocsText(v); setDirty(true); }} rows={4} />
              <Text label={t.howHi} value={c.howToApplyHi} onChange={(v) => set("howToApplyHi", v)} rows={3} />
            </>
          ) : (
            <>
              <p className="text-[0.9rem] text-muted">{t.enHint}</p>
              <Text label="Summary" value={c.summaryEn} onChange={(v) => set("summaryEn", v)} rows={3} />
              <Text label="Benefit" value={c.benefitEn} onChange={(v) => set("benefitEn", v)} />
              <Text label="Who can apply" value={c.eligibilityEn} onChange={(v) => set("eligibilityEn", v)} rows={2} />
              <Text label="Documents (one per line)" value={docsEnText} onChange={(v) => { setDocsEnText(v); setDirty(true); }} rows={4} />
              <Text label="How to apply" value={c.howToApplyEn} onChange={(v) => set("howToApplyEn", v)} rows={3} />
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="need">{t.need}</label>
              <select id="need" value={c.need} onChange={(e) => set("need", e.target.value)} className="input">
                {NEEDS.map((n) => <option key={n.key} value={n.key}>{n[lang]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="checked">{t.checked}</label>
              <input id="checked" type="date" value={c.lastChecked} onChange={(e) => set("lastChecked", e.target.value)} className="input" />
            </div>
          </div>

          <div className="card grid gap-3 p-4">
            <p className="font-bold">{t.rules}</p>
            <p className="text-[0.9rem] text-muted">{t.rulesLead}</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={t.minAge} value={c.rules.minAge} onChange={(v) => setRule("minAge", v)} />
              <NumberField label={t.maxAge} value={c.rules.maxAge} onChange={(v) => setRule("maxAge", v)} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MARITAL.map((k) => (
                <Check key={k} label={t.marital[k]} checked={!!c.rules.marital?.includes(k)} onChange={() => setRule("marital", toggle(c.rules.marital, k))} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Check label={t.bpl} checked={c.rules.bpl === true} onChange={(on) => setRule("bpl", on ? true : undefined)} />
              <Check label={t.shg} checked={c.rules.shg === true} onChange={(on) => setRule("shg", on ? true : undefined)} />
              <Check label={t.pregFirst} checked={!!c.rules.pregnancy?.includes("FIRST")} onChange={() => setRule("pregnancy", toggle(c.rules.pregnancy, "FIRST"))} />
              <Check label={t.pregLater} checked={!!c.rules.pregnancy?.includes("LATER")} onChange={() => setRule("pregnancy", toggle(c.rules.pregnancy, "LATER"))} />
            </div>
            <p className="text-[0.9rem] font-semibold">{t.districts}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {DISTRICTS.map((d) => (
                <Check key={d.key} label={d[lang]} checked={c.districts.includes(d.key)} onChange={() => set("districts", toggle(c.districts, d.key))} />
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <section aria-labelledby="log-h" className="grid gap-2">
        <h2 id="log-h" className="text-lg">{t.activity}</h2>
        {log.length === 0 ? (
          <p className="text-muted">{t.noActivity}</p>
        ) : (
          <ul className="text-[0.9rem] text-muted">
            {log.map((l) => (
              <li key={l.id}>{new Date(l.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}: {l.action} ({l.actor})</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Text({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <label className="grid gap-1 text-[0.95rem]">
      {label}
      <input
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => {
          const n = e.target.value.replace(/\D/g, "");
          onChange(n ? Number(n) : undefined);
        }}
        className="input"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[#26346e]" />
      {label}
    </label>
  );
}
