"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { DICTS, Lang } from "@/lib/i18n";
import { createDonation, payDonation } from "@/app/actions/donate";
import { TEST_CARDS, TEST_UPI } from "@/lib/payments";
import { formatINR } from "@/lib/money";
import { MIN_DONATION } from "@/lib/limits";

const PRESETS = [500, 1000, 2500, 5000];

type Props = { lang: Lang; campaignSlug: string; prefill?: { name: string; email: string } };

export function DonateFlow({ lang, campaignSlug, prefill }: Props) {
  const t = DICTS[lang].donate;
  const router = useRouter();
  // One key per page load: retries and double taps map to one donation.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState<"ONE_TIME" | "MONTHLY">("ONE_TIME");
  const [details, setDetails] = useState({
    donorName: prefill?.name ?? "",
    donorEmail: prefill?.email ?? "",
    donorPan: "",
    donorAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [donationId, setDonationId] = useState<string | null>(null);
  const [method, setMethod] = useState<"UPI" | "CARD">("UPI");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [payError, setPayError] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();

  const finalAmount = custom ? Number(custom) : amount;

  function nextFromAmount() {
    if (!Number.isInteger(finalAmount) || finalAmount < MIN_DONATION) {
      setErrors({ amount: t.minError(formatINR(MIN_DONATION)) });
      return;
    }
    setErrors({});
    setStep(1);
  }

  function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createDonation({ idempotencyKey, campaignSlug, amount: finalAmount, frequency, ...details });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error ?? DICTS[lang].common.error });
        if (res.fieldErrors?.amount) setStep(0);
        return;
      }
      setErrors({});
      setDonationId(res.donationId);
      setStep(2);
    });
  }

  function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!donationId) return;
    setPayError(null);
    start(async () => {
      const res = await payDonation({ donationId, method, upiId, cardNumber });
      if (res.ok) router.push(res.redirectTo);
      else setPayError(res);
    });
  }

  const field = (name: keyof typeof details, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input
        id={name}
        name={name}
        value={details[name]}
        onChange={(e) => setDetails({ ...details, [name]: e.target.value })}
        className="input"
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-err` : hint ? `${name}-hint` : undefined}
        {...props}
      />
      {hint && !errors[name] && <p id={`${name}-hint`} className="mt-1 text-[0.9rem] text-muted">{hint}</p>}
      {errors[name] && <p id={`${name}-err`} className="mt-1 text-bad">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="card grid gap-6 p-5 sm:p-6">
      <ol className="flex gap-2 text-[0.9rem]" aria-label={t.stepsLabel}>
        {t.steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
            <span className={i === step ? "font-semibold text-ink" : "text-muted"}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="label">{t.howMuch}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setAmount(p); setCustom(""); }}
                  aria-pressed={!custom && amount === p}
                  className={`btn-secondary text-lg ${!custom && amount === p ? "chip-on" : ""}`}
                >
                  {formatINR(p)}
                </button>
              ))}
            </div>
            <label htmlFor="custom" className="mt-2 text-[0.95rem] text-muted">{t.own}</label>
            <input
              id="custom"
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 7))}
              className="input"
              placeholder={t.ownPlaceholder}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-bad" role="alert">{errors.amount}</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="label">{t.howOften}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["ONE_TIME", "MONTHLY"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  aria-pressed={frequency === f}
                  className={`btn-secondary ${frequency === f ? "chip-on" : ""}`}
                >
                  {f === "ONE_TIME" ? t.once : t.monthly}
                </button>
              ))}
            </div>
            {frequency === "MONTHLY" && (
              <p className="text-[0.9rem] text-muted">{t.monthlyNote(formatINR(finalAmount || 0))}</p>
            )}
          </fieldset>

          <button onClick={nextFromAmount} className="btn-primary">
            {t.next} {formatINR(finalAmount || 0)}{frequency === "MONTHLY" ? t.perMonth : ""}
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={submitDetails} className="grid gap-4" noValidate>
          {field("donorName", t.name, { autoComplete: "name" })}
          {field("donorEmail", t.email, { type: "email", autoComplete: "email", inputMode: "email" }, t.emailHint)}
          {field(
            "donorPan",
            t.pan,
            { autoCapitalize: "characters", maxLength: 10, style: { textTransform: "uppercase" } },
            t.panHint,
          )}
          {field("donorAddress", t.address, { autoComplete: "street-address" })}
          {errors.form && <p role="alert" className="text-bad">{errors.form}</p>}
          <p className="text-[0.9rem] text-muted">
            {t.privacy}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="btn-secondary">{t.back}</button>
            <button disabled={pending} className="btn-primary flex-1">{pending ? t.saving : t.toPay}</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={pay} className="grid gap-4">
          <p className="rounded-xl bg-warn-soft p-3 text-[0.95rem] text-warn">
            <strong>{t.testMode}</strong> {t.noReal}
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.method}>
            {(["UPI", "CARD"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => { setMethod(m); setPayError(null); }}
                className={`btn-secondary ${method === m ? "chip-on" : ""}`}
              >
                {m === "UPI" ? "UPI" : t.card}
              </button>
            ))}
          </div>

          {method === "UPI" ? (
            <div>
              <label htmlFor="upi" className="label">{t.upiId}</label>
              <input id="upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="input" placeholder="name@bank" autoComplete="off" />
              <p className="mt-1 text-[0.9rem] text-muted">{t.test} <code>{TEST_UPI.success}</code> {t.ok}, <code>{TEST_UPI.failure}</code> {t.fail}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="card" className="label">{t.cardNo}</label>
              <input id="card" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="input" autoComplete="cc-number" />
              <p className="mt-1 text-[0.9rem] text-muted">
                {t.test} {t.indian} <code>{TEST_CARDS.success}</code> · {t.declined} <code>{TEST_CARDS.declined}</code> · {t.foreign} <code>{TEST_CARDS.foreign}</code>
              </p>
            </div>
          )}

          {payError && (
            <div role="alert" className={`rounded-xl p-3 ${payError.code === "FOREIGN_CARD" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
              {payError.code === "FOREIGN_CARD" && <strong className="block">{t.foreignTitle}</strong>}
              {payError.message}
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[0.85rem] text-muted"><Lock className="size-3.5" aria-hidden /> {t.secure}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">{t.back}</button>
            <button disabled={pending} className="btn-primary flex-1">
              <Lock className="size-4" aria-hidden /> {pending ? t.paying : t.give(formatINR(finalAmount))}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
