"use client";

import { useActionState } from "react";
import { createScheme } from "@/app/actions/admin";
import { NEEDS } from "@/lib/content";
import { DICTS, Lang } from "@/lib/i18n";

export function NewSchemeForm({ lang }: { lang: Lang }) {
  const t = DICTS[lang].admin.newScheme;
  const [state, action, pending] = useActionState(createScheme, {});
  return (
    <form action={action} className="card grid gap-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="label">{t.code}</label>
          <input id="code" name="code" placeholder="SCH-080" required className="input" />
        </div>
        <div>
          <label htmlFor="need" className="label">{t.need}</label>
          <select id="need" name="need" className="input">
            {NEEDS.map((n) => <option key={n.key} value={n.key}>{n[lang]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="titleHi" className="label">{t.titleHi}</label>
        <input id="titleHi" name="titleHi" required className="input" />
      </div>
      <div>
        <label htmlFor="titleEn" className="label">{t.titleEn}</label>
        <input id="titleEn" name="titleEn" required className="input" />
      </div>
      <div>
        <label htmlFor="sourceUrl" className="label">{t.sourceUrl}</label>
        <input id="sourceUrl" name="sourceUrl" type="url" required className="input" />
      </div>
      <div>
        <label htmlFor="noticeText" className="label">{t.notice}</label>
        <textarea id="noticeText" name="noticeText" rows={8} required className="input" />
      </div>
      {state.error && <p role="alert" className="text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? t.creating : t.create}</button>
    </form>
  );
}
