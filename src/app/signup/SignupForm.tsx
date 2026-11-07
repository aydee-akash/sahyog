"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signup, SignupState } from "@/app/actions/auth";
import { DICTS, Lang } from "@/lib/i18n";

export function SignupForm({ lang }: { lang: Lang }) {
  const t = DICTS[lang].signup;
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, { step: "details" });

  if (state.step === "code") {
    return (
      <form action={action} className="card fade-up grid gap-4 p-5">
        <input type="hidden" name="step" value="code" />
        <input type="hidden" name="email" value={state.email} />
        <p className="flex items-start gap-2"><MailCheck className="mt-1 size-5 shrink-0 text-ok" aria-hidden /> {t.codeSent(state.email!)}</p>
        {state.testCode && (
          <p className="rounded-xl bg-warn-soft p-3 text-[0.95rem] text-warn">
            {t.testCode} <strong className="tracking-widest">{state.testCode}</strong>
          </p>
        )}
        <div>
          <label htmlFor="code" className="label">{t.code}</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="input text-center text-2xl tracking-[0.5em]" />
        </div>
        {state.error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{state.error}</p>}
        <button disabled={pending} className="btn-primary">{pending ? t.verifying : t.verify}</button>
      </form>
    );
  }

  return (
    <form action={action} className="card grid gap-4 p-5">
      <input type="hidden" name="step" value="details" />
      <div>
        <label htmlFor="name" className="label">{t.name}</label>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">{t.password}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? t.sending : t.sendCode}</button>
    </form>
  );
}
