"use client";

import { useActionState } from "react";
import { login, LoginState } from "@/app/actions/auth";
import { DICTS, Lang } from "@/lib/i18n";

export function LoginForm({ next, lang }: { next?: string; lang: Lang }) {
  const t = DICTS[lang].login;
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card grid gap-4 p-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">{t.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? t.busy : t.submit}</button>
    </form>
  );
}
