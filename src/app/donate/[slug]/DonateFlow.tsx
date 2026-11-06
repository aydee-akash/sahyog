"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createDonation, payDonation } from "@/app/actions/donate";
import { TEST_CARDS, TEST_UPI } from "@/lib/payments";
import { formatINR } from "@/lib/money";
import { MIN_DONATION } from "@/lib/validation";

const PRESETS = [500, 1000, 2500, 5000];
const STEPS = ["राशि", "आपकी जानकारी", "भुगतान"];

type Props = { campaignSlug: string; prefill?: { name: string; email: string } };

export function DonateFlow({ campaignSlug, prefill }: Props) {
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
      setErrors({ amount: `कम से कम ${formatINR(MIN_DONATION)} लिखें` });
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
        setErrors(res.fieldErrors ?? { form: res.error ?? "कुछ गड़बड़ हुई" });
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
      <ol className="flex gap-2 text-[0.9rem]" aria-label="दान के चरण">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
            <span className={i === step ? "font-semibold text-ink" : "text-muted"}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="label">कितना दान करेंगे?</legend>
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
            <label htmlFor="custom" className="mt-2 text-[0.95rem] text-muted">या अपनी राशि (₹)</label>
            <input
              id="custom"
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 7))}
              className="input"
              placeholder="जैसे 3000"
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-bad" role="alert">{errors.amount}</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="label">कितनी बार?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["ONE_TIME", "MONTHLY"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  aria-pressed={frequency === f}
                  className={`btn-secondary ${frequency === f ? "chip-on" : ""}`}
                >
                  {f === "ONE_TIME" ? "एक बार" : "हर महीने"}
                </button>
              ))}
            </div>
            {frequency === "MONTHLY" && (
              <p className="text-[0.9rem] text-muted">हर महीने उसी तारीख को {formatINR(finalAmount || 0)}। कभी भी रोक सकते हैं। हर किस्त की अलग रसीद मिलेगी।</p>
            )}
          </fieldset>

          <button onClick={nextFromAmount} className="btn-primary">
            आगे: {formatINR(finalAmount || 0)}{frequency === "MONTHLY" ? " / महीना" : ""}
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={submitDetails} className="grid gap-4" noValidate>
          {field("donorName", "पूरा नाम (PAN कार्ड जैसा)", { autoComplete: "name" })}
          {field("donorEmail", "ईमेल", { type: "email", autoComplete: "email", inputMode: "email" }, "रसीद और 80G प्रमाण पत्र यहाँ भेजा जाएगा")}
          {field(
            "donorPan",
            "PAN नंबर",
            { autoCapitalize: "characters", maxLength: 10, style: { textTransform: "uppercase" } },
            "80G टैक्स छूट के लिए ज़रूरी। ट्रस्ट इसे Form 10BD में आयकर विभाग को भेजता है।",
          )}
          {field("donorAddress", "पता", { autoComplete: "street-address" })}
          {errors.form && <p role="alert" className="text-bad">{errors.form}</p>}
          <p className="text-[0.9rem] text-muted">
            आपकी जानकारी केवल रसीद और आयकर रिपोर्टिंग के लिए है (DPDP Act 2023)। हम इसे किसी को बेचते या साझा नहीं करते।
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="btn-secondary">पीछे</button>
            <button disabled={pending} className="btn-primary flex-1">{pending ? "सेव हो रहा है…" : "आगे: भुगतान"}</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={pay} className="grid gap-4">
          <p className="rounded-xl bg-warn-soft p-3 text-[0.95rem] text-warn">
            <strong>टेस्ट मोड:</strong> असली पैसा नहीं कटेगा।
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="भुगतान का तरीका">
            {(["UPI", "CARD"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => { setMethod(m); setPayError(null); }}
                className={`btn-secondary ${method === m ? "chip-on" : ""}`}
              >
                {m === "UPI" ? "UPI" : "डेबिट / क्रेडिट कार्ड"}
              </button>
            ))}
          </div>

          {method === "UPI" ? (
            <div>
              <label htmlFor="upi" className="label">UPI ID</label>
              <input id="upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="input" placeholder="name@bank" autoComplete="off" />
              <p className="mt-1 text-[0.9rem] text-muted">टेस्ट: <code>{TEST_UPI.success}</code> सफल, <code>{TEST_UPI.failure}</code> असफल</p>
            </div>
          ) : (
            <div>
              <label htmlFor="card" className="label">कार्ड नंबर</label>
              <input id="card" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="input" autoComplete="cc-number" />
              <p className="mt-1 text-[0.9rem] text-muted">
                टेस्ट: भारतीय <code>{TEST_CARDS.success}</code> · अस्वीकार <code>{TEST_CARDS.declined}</code> · विदेशी <code>{TEST_CARDS.foreign}</code>
              </p>
            </div>
          )}

          {payError && (
            <div role="alert" className={`rounded-xl p-3 ${payError.code === "FOREIGN_CARD" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
              {payError.code === "FOREIGN_CARD" && <strong className="block">विदेशी कार्ड स्वीकार नहीं</strong>}
              {payError.message}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">पीछे</button>
            <button disabled={pending} className="btn-primary flex-1">
              {pending ? "भुगतान हो रहा है…" : `${formatINR(finalAmount)} दान करें`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
