"use client";

import { useActionState } from "react";
import { saveCampaign } from "@/app/actions/admin";
import { DICTS, Lang } from "@/lib/i18n";

type C = { id: string; slug: string; titleHi: string; titleEn: string; blurbHi: string; blurbEn: string; goal: number; active: boolean };

export function CampaignForm({ lang, campaign }: { lang: Lang; campaign?: C }) {
  const t = DICTS[lang].admin.campaignForm;
  const [state, action, pending] = useActionState(saveCampaign, {});
  const f = (name: keyof C, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1">
      <span className="font-semibold">{label}</span>
      <input name={name} defaultValue={campaign ? String(campaign[name]) : ""} required className="input" {...props} />
    </label>
  );
  return (
    <form action={action} className="grid gap-3">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {f("titleHi", t.titleHi)}
        {f("titleEn", t.titleEn)}
        {f("slug", t.slug, { pattern: "[a-z0-9\\-]{3,40}", placeholder: "maa-swasthya" })}
        {f("goal", t.goal, { inputMode: "numeric", type: "number", min: 10000 })}
      </div>
      <label className="grid gap-1">
        <span className="font-semibold">{t.blurbHi}</span>
        <textarea name="blurbHi" defaultValue={campaign?.blurbHi} required rows={2} className="input" />
      </label>
      <label className="grid gap-1">
        <span className="font-semibold">{t.blurbEn}</span>
        <textarea name="blurbEn" defaultValue={campaign?.blurbEn} rows={2} className="input" />
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="active" defaultChecked={campaign ? campaign.active : true} className="size-5 accent-[#26346e]" />
        {t.active}
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-xl bg-ok-soft p-3 text-ok">{t.saved}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? t.saving : campaign ? t.save : t.create}</button>
    </form>
  );
}
