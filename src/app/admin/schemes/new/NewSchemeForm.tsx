"use client";

import { useActionState } from "react";
import { createScheme } from "@/app/actions/admin";
import { NEEDS } from "@/lib/content";

export function NewSchemeForm() {
  const [state, action, pending] = useActionState(createScheme, {});
  return (
    <form action={action} className="card grid gap-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="label">कोड</label>
          <input id="code" name="code" placeholder="SCH-080" required className="input" />
        </div>
        <div>
          <label htmlFor="need" className="label">ज़रूरत</label>
          <select id="need" name="need" className="input">
            {NEEDS.map((n) => <option key={n.key} value={n.key}>{n.hi}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="titleHi" className="label">नाम (हिंदी)</label>
        <input id="titleHi" name="titleHi" required className="input" />
      </div>
      <div>
        <label htmlFor="titleEn" className="label">Name (English)</label>
        <input id="titleEn" name="titleEn" required className="input" />
      </div>
      <div>
        <label htmlFor="sourceUrl" className="label">आधिकारिक स्रोत URL</label>
        <input id="sourceUrl" name="sourceUrl" type="url" required className="input" />
      </div>
      <div>
        <label htmlFor="noticeText" className="label">आधिकारिक सूचना का पाठ</label>
        <textarea id="noticeText" name="noticeText" rows={8} required className="input" />
      </div>
      {state.error && <p role="alert" className="text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? "बन रही है…" : "ड्राफ़्ट बनाएँ"}</button>
    </form>
  );
}
