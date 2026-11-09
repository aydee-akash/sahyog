"use client";

import { useActionState } from "react";
import { saveCampaign } from "@/app/actions/admin";

type C = { id: string; slug: string; titleHi: string; titleEn: string; blurbHi: string; blurbEn: string; goal: number; active: boolean };

export function CampaignForm({ campaign }: { campaign?: C }) {
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
        {f("titleHi", "नाम (हिंदी)")}
        {f("titleEn", "Name (English)")}
        {f("slug", "slug (URL)", { pattern: "[a-z0-9\\-]{3,40}", placeholder: "maa-swasthya" })}
        {f("goal", "लक्ष्य (₹)", { inputMode: "numeric", type: "number", min: 10000 })}
      </div>
      <label className="grid gap-1">
        <span className="font-semibold">विवरण (हिंदी)</span>
        <textarea name="blurbHi" defaultValue={campaign?.blurbHi} required rows={2} className="input" />
      </label>
      <label className="grid gap-1">
        <span className="font-semibold">Description (English)</span>
        <textarea name="blurbEn" defaultValue={campaign?.blurbEn} rows={2} className="input" />
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="active" defaultChecked={campaign ? campaign.active : true} className="size-5 accent-[#26346e]" />
        चालू (होम पेज पर दिखे)
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-xl bg-ok-soft p-3 text-ok">सेव हो गया।</p>}
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? "सेव हो रहा है…" : campaign ? "सेव करें" : "अभियान बनाएँ"}</button>
    </form>
  );
}
