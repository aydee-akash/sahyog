"use client";

import { useId, useState } from "react";
import { useBusy } from "@/components/useBusy";
import type { SchemeStatus } from "@prisma/client";
import { generateDraft, saveScheme, transitionScheme } from "@/app/actions/admin";
import { DISTRICTS, NEEDS, STATUS_HI } from "@/lib/content";
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
  scheme: { id: string; code: string; status: SchemeStatus; reviewedBy: string | null; content: Content };
  log: { id: string; actor: string; action: string; at: string }[];
};

const MARITAL = [
  ["MARRIED", "विवाहित"],
  ["WIDOW", "विधवा"],
  ["SEPARATED", "तलाकशुदा / परित्यक्ता"],
  ["UNMARRIED", "अविवाहित"],
] as const;

export function Editor({ scheme, log }: Props) {
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
      setMsg({ kind: "warn", text: "AI ड्राफ़्ट भर दिया गया। सूचना से मिलाकर हर लाइन जाँचें, फिर सेव करें।" });
    });
  }

  function save() {
    start(async () => {
      const res = await saveScheme(scheme.id, payload());
      if (!res.ok) return setMsg({ kind: "err", text: res.error });
      setDirty(false);
      setMsg({ kind: "ok", text: "सेव हो गया (ड्राफ़्ट)।" });
    });
  }

  function move(to: SchemeStatus) {
    start(async () => {
      const res = await transitionScheme(scheme.id, to);
      if (!res.ok) return setMsg({ kind: "err", text: res.error });
      setMsg({ kind: "ok", text: `स्थिति: ${STATUS_HI[to]}` });
    });
  }

  const readOnly = status !== "DRAFT";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.9rem] text-muted">{scheme.code} · {STATUS_HI[status]}{scheme.reviewedBy ? ` · स्वीकृत: ${scheme.reviewedBy}` : ""}</p>
          <h1 className="text-[1.75rem] font-bold">{c.titleHi}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "DRAFT" && (
            <>
              <button onClick={save} disabled={pending || !dirty} className="btn-secondary">सेव करें</button>
              <button onClick={() => move("IN_REVIEW")} disabled={pending || dirty} className="btn-primary" title={dirty ? "पहले सेव करें" : undefined}>
                समीक्षा के लिए भेजें
              </button>
            </>
          )}
          {status === "IN_REVIEW" && (
            <>
              <button onClick={() => move("DRAFT")} disabled={pending} className="btn-secondary">वापस ड्राफ़्ट में</button>
              <button onClick={() => move("PUBLISHED")} disabled={pending} className="btn-primary">स्वीकृत करें और प्रकाशित करें</button>
            </>
          )}
          {status === "PUBLISHED" && (
            <button onClick={() => move("DRAFT")} disabled={pending} className="btn-secondary">बदलाव के लिए अप्रकाशित करें</button>
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
          {status === "IN_REVIEW" ? "समीक्षा में: सूचना से मिलाकर जाँचें, फिर स्वीकृत करें या वापस भेजें।" : "प्रकाशित योजना। बदलाव के लिए पहले अप्रकाशित करें; बदलाव फिर से समीक्षा से गुज़रेंगे।"}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="notice-h" className="card grid content-start gap-3 p-5 lg:sticky lg:top-4 lg:self-start">
          <h2 id="notice-h" className="text-lg font-bold">आधिकारिक सूचना (स्रोत)</h2>
          <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[0.9rem] text-accent underline">{c.sourceUrl}</a>
          <textarea
            value={c.noticeText}
            onChange={(e) => set("noticeText", e.target.value)}
            readOnly={readOnly}
            rows={12}
            className="input font-[system-ui] text-[0.9rem]"
            aria-label="आधिकारिक सूचना का पाठ"
          />
          {status === "DRAFT" && (
            <button onClick={draft} disabled={aiPending} className="btn-primary">
              {aiPending ? "AI ड्राफ़्ट बना रहा है…" : "AI से सरल हिंदी ड्राफ़्ट बनाएँ"}
            </button>
          )}
          {notFound.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-warn">
              <p className="font-semibold">AI को सूचना में ये नहीं मिला। विभाग से पुष्टि करें:</p>
              <ul className="list-disc pl-5">{notFound.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </section>

        <fieldset disabled={readOnly} className="grid content-start gap-4">
          <legend className="sr-only">सरल हिंदी सामग्री</legend>
          {c.aiDrafted && status !== "PUBLISHED" && (
            <p className="badge justify-self-start bg-accent-soft text-accent-strong">AI ड्राफ़्ट: संपादक की जाँच ज़रूरी</p>
          )}
          <Text label="नाम (हिंदी)" value={c.titleHi} onChange={(v) => set("titleHi", v)} />
          <Text label="Name (English)" value={c.titleEn} onChange={(v) => set("titleEn", v)} />
          <div className="flex gap-1 rounded-xl bg-paper p-1 ring-1 ring-line" role="tablist" aria-label="भाषा">
            {(["hi", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={tab === l}
                onClick={() => setTab(l)}
                className={`flex-1 rounded-lg py-2 font-semibold ${tab === l ? "bg-card text-accent-strong shadow-sm" : "text-muted"}`}
              >
                {l === "hi" ? "हिंदी (मुख्य)" : "English"}
              </button>
            ))}
          </div>
          {tab === "hi" ? (
            <>
              <Text label="सारांश (2–3 वाक्य)" value={c.summaryHi} onChange={(v) => set("summaryHi", v)} rows={3} />
              <Text label="लाभ" value={c.benefitHi} onChange={(v) => set("benefitHi", v)} />
              <Text label="कौन आवेदन कर सकती है" value={c.eligibilityHi} onChange={(v) => set("eligibilityHi", v)} rows={2} />
              <Text label="ज़रूरी कागज़ (हर लाइन में एक)" value={docsText} onChange={(v) => { setDocsText(v); setDirty(true); }} rows={4} />
              <Text label="आवेदन कैसे करें" value={c.howToApplyHi} onChange={(v) => set("howToApplyHi", v)} rows={3} />
            </>
          ) : (
            <>
              <p className="text-[0.9rem] text-muted">खाली छोड़ने पर English पेज पर हिंदी दिखेगी।</p>
              <Text label="Summary" value={c.summaryEn} onChange={(v) => set("summaryEn", v)} rows={3} />
              <Text label="Benefit" value={c.benefitEn} onChange={(v) => set("benefitEn", v)} />
              <Text label="Who can apply" value={c.eligibilityEn} onChange={(v) => set("eligibilityEn", v)} rows={2} />
              <Text label="Documents (one per line)" value={docsEnText} onChange={(v) => { setDocsEnText(v); setDirty(true); }} rows={4} />
              <Text label="How to apply" value={c.howToApplyEn} onChange={(v) => set("howToApplyEn", v)} rows={3} />
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="need">ज़रूरत</label>
              <select id="need" value={c.need} onChange={(e) => set("need", e.target.value)} className="input">
                {NEEDS.map((n) => <option key={n.key} value={n.key}>{n.hi}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="checked">आखिरी जाँच की तारीख</label>
              <input id="checked" type="date" value={c.lastChecked} onChange={(e) => set("lastChecked", e.target.value)} className="input" />
            </div>
          </div>

          <div className="card grid gap-3 p-4">
            <p className="font-bold">खोजक के नियम (Finder rules)</p>
            <p className="text-[0.9rem] text-muted">ये तय नियम हैं, AI नहीं। खोजक इन्हीं से मिलान करता है और उपयोगकर्ता को दिखाता है।</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="न्यूनतम उम्र" value={c.rules.minAge} onChange={(v) => setRule("minAge", v)} />
              <NumberField label="अधिकतम उम्र" value={c.rules.maxAge} onChange={(v) => setRule("maxAge", v)} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MARITAL.map(([k, l]) => (
                <Check key={k} label={l} checked={!!c.rules.marital?.includes(k)} onChange={() => setRule("marital", toggle(c.rules.marital, k))} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Check label="BPL कार्ड ज़रूरी" checked={c.rules.bpl === true} onChange={(on) => setRule("bpl", on ? true : undefined)} />
              <Check label="SHG सदस्य ज़रूरी" checked={c.rules.shg === true} onChange={(on) => setRule("shg", on ? true : undefined)} />
              <Check label="गर्भवती: पहला बच्चा" checked={!!c.rules.pregnancy?.includes("FIRST")} onChange={() => setRule("pregnancy", toggle(c.rules.pregnancy, "FIRST"))} />
              <Check label="गर्भवती: दूसरा+" checked={!!c.rules.pregnancy?.includes("LATER")} onChange={() => setRule("pregnancy", toggle(c.rules.pregnancy, "LATER"))} />
            </div>
            <p className="text-[0.9rem] font-semibold">ज़िले (कोई न चुनें = सभी ज़िले)</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {DISTRICTS.map((d) => (
                <Check key={d.key} label={d.hi} checked={c.districts.includes(d.key)} onChange={() => set("districts", toggle(c.districts, d.key))} />
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <section aria-labelledby="log-h" className="grid gap-2">
        <h2 id="log-h" className="text-lg font-bold">गतिविधि</h2>
        {log.length === 0 ? (
          <p className="text-muted">अभी कोई गतिविधि नहीं।</p>
        ) : (
          <ul className="text-[0.9rem] text-muted">
            {log.map((l) => (
              <li key={l.id}>{new Date(l.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {l.actor} · {l.action}</li>
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[#8a3b12]" />
      {label}
    </label>
  );
}
