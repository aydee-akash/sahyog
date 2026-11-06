"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DISTRICTS } from "@/lib/content";
import { FinderMatch, findSchemes, requestCallback } from "@/app/actions/finder";
import { ArrowIcon, CheckIcon, PhoneIcon } from "@/components/icons";
import { TRUST } from "@/lib/trust";

type Answers = { age?: number; marital?: string; bpl?: string; shg?: string; pregnancy?: string; district?: string };
type Key = keyof Answers;

const QUESTIONS: { key: Key; q: string; options?: { v: string; l: string }[] }[] = [
  { key: "age", q: "आपकी उम्र कितनी है?" },
  {
    key: "marital",
    q: "आपकी वैवाहिक स्थिति क्या है?",
    options: [
      { v: "MARRIED", l: "विवाहित" },
      { v: "WIDOW", l: "विधवा" },
      { v: "SEPARATED", l: "तलाकशुदा / परित्यक्ता" },
      { v: "UNMARRIED", l: "अविवाहित" },
    ],
  },
  {
    key: "bpl",
    q: "क्या आपके परिवार के पास BPL (गरीबी रेखा) राशन कार्ड है?",
    options: [
      { v: "YES", l: "हाँ" },
      { v: "NO", l: "नहीं" },
      { v: "UNSURE", l: "पता नहीं" },
    ],
  },
  {
    key: "shg",
    q: "क्या आप किसी स्वयं सहायता समूह (SHG) की सदस्य हैं?",
    options: [
      { v: "YES", l: "हाँ" },
      { v: "NO", l: "नहीं" },
      { v: "UNSURE", l: "पता नहीं" },
    ],
  },
  {
    key: "pregnancy",
    q: "क्या आप अभी गर्भवती हैं?",
    options: [
      { v: "FIRST", l: "हाँ, पहला बच्चा" },
      { v: "LATER", l: "हाँ, दूसरा या बाद का बच्चा" },
      { v: "NO", l: "नहीं" },
    ],
  },
  { key: "district", q: "आप किस ज़िले में रहती हैं?", options: DISTRICTS.map((d) => ({ v: d.key, l: d.hi })) },
];

export function Finder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [age, setAge] = useState("");
  const [ageError, setAgeError] = useState("");
  const [matches, setMatches] = useState<FinderMatch[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const q = QUESTIONS[step];

  function answer(key: Key, value: string | number) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    setError("");
    start(async () => {
      const res = await findSchemes(next);
      if (res.ok) setMatches(res.matches);
      else setError(res.error);
    });
  }

  function submitAge(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(age);
    if (!Number.isInteger(n) || n < 14 || n > 110) {
      setAgeError("उम्र 14 से 110 के बीच वर्षों में लिखें");
      return;
    }
    setAgeError("");
    answer("age", n);
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setAge("");
    setMatches(null);
  }

  if (matches) return <Results matches={matches} district={answers.district!} onRestart={restart} />;

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="grid gap-2">
        <p className="text-[0.95rem] text-muted" aria-live="polite">
          सवाल {step + 1} / {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <h1 className="text-[1.75rem] font-bold leading-snug" id="q">{q.q}</h1>

      {q.key === "age" ? (
        <form onSubmit={submitAge} className="grid gap-3" aria-labelledby="q">
          <label htmlFor="age" className="sr-only">उम्र (वर्ष)</label>
          <div className="flex items-center gap-3">
            <input
              id="age"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="input w-32 text-center text-2xl"
              aria-invalid={!!ageError}
              aria-describedby={ageError ? "age-err" : undefined}
            />
            <span className="text-lg">वर्ष</span>
          </div>
          {ageError && <p id="age-err" className="text-bad">{ageError}</p>}
          <button className="btn-primary justify-self-start">आगे <ArrowIcon /></button>
        </form>
      ) : (
        <div className={`grid gap-3 ${q.options!.length > 4 ? "grid-cols-2" : ""}`} role="group" aria-labelledby="q">
          {q.options!.map((o) => (
            <button
              key={o.v}
              onClick={() => answer(q.key, o.v)}
              disabled={pending}
              className={`btn-secondary min-h-14 justify-start text-left text-lg ${answers[q.key] === o.v ? "chip-on" : ""}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      {pending && <p aria-live="polite" className="text-muted">योजनाएँ खोजी जा रही हैं…</p>}
      {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}

      {step > 0 && !pending && (
        <button onClick={() => setStep(step - 1)} className="btn-ghost justify-self-start">← पिछला सवाल</button>
      )}
      <p className="text-[0.9rem] text-muted">आपके जवाब कहीं सेव नहीं होते। ये केवल योजनाएँ मिलाने के लिए हैं।</p>
    </div>
  );
}

function Results({ matches, district, onRestart }: { matches: FinderMatch[]; district: string; onRestart: () => void }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <h1 className="text-[1.75rem] font-bold">
          {matches.length ? `${matches.length} संभावित योजनाएँ` : "अभी कोई योजना मेल नहीं खाई"}
        </h1>
        <p className="rounded-xl bg-warn-soft p-3 text-warn">
          यह केवल अनुमान है, पक्का वादा नहीं। अंतिम फ़ैसला सरकारी विभाग करता है। नीचे वे नियम दिए हैं जिनसे मिलान किया गया।
        </p>
      </div>

      {matches.length === 0 && (
        <p className="text-muted">आपके जवाबों से हमारी सूची की कोई योजना पूरी तरह मेल नहीं खाई। हमारी टीम से बात करें, वे और विकल्प बता सकती हैं।</p>
      )}

      <ul className="grid gap-4">
        {matches.map((m) => (
          <li key={m.code} className="card grid gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{m.titleHi}</h2>
                <p className="font-semibold text-accent-strong">{m.benefitHi}</p>
              </div>
              <span className={`badge ${m.verdict === "LIKELY" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
                {m.verdict === "LIKELY" ? "मेल खाती है" : "शायद, पुष्टि करें"}
              </span>
            </div>
            <ul className="grid gap-1 text-[0.95rem]" aria-label="जाँचे गए नियम">
              {m.checks.length === 0 && <li className="text-muted">इस योजना में कोई खास शर्त नहीं है।</li>}
              {m.checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.result === "MET" ? (
                    <CheckIcon className="size-5 text-ok" />
                  ) : (
                    <span aria-hidden className="grid size-5 place-items-center font-bold text-warn">?</span>
                  )}
                  <span>{c.label}</span>
                  <span className="sr-only">{c.result === "MET" ? "मेल खाता है" : "पता नहीं"}</span>
                </li>
              ))}
            </ul>
            <Link href={`/schemes/${m.code}?district=${district}`} className="btn-secondary justify-self-start">
              कागज़ और आवेदन का तरीका <ArrowIcon />
            </Link>
          </li>
        ))}
      </ul>

      <Callback district={district} codes={matches.map((m) => m.code)} />

      <button onClick={onRestart} className="btn-ghost justify-self-start">फिर से शुरू करें</button>
    </div>
  );
}

function Callback({ district, codes }: { district: string; codes: string[] }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ done?: boolean; error?: string }>({});
  const [pending, start] = useTransition();

  if (state.done) {
    return (
      <div className="card flex items-center gap-3 bg-ok-soft p-5 text-ok" role="status">
        <CheckIcon /> धन्यवाद। हमारी टीम 2 कामकाजी दिनों में आपको कॉल करेगी।
      </div>
    );
  }

  return (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestCallback({ phone, district, schemeCodes: codes, consent });
          setState(res.ok ? { done: true } : { error: res.error });
        });
      }}
    >
      <h2 className="text-xl font-bold">हमसे बात करें</h2>
      <p className="text-muted">
        नंबर छोड़ें, हमारी टीम कॉल करके मदद करेगी। या अभी कॉल करें{" "}
        <a href={`tel:${TRUST.helpline.replace(/\D/g, "")}`} className="font-semibold text-accent">{TRUST.helpline}</a>
      </p>
      <label htmlFor="phone" className="label">मोबाइल नंबर</label>
      <input
        id="phone"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="input"
        aria-invalid={!!state.error}
      />
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1.5 size-5 accent-[#8a3b12]" />
        <span>मैं सहमत हूँ कि ट्रस्ट योजनाओं के बारे में मुझे इस नंबर पर कॉल करे।</span>
      </label>
      {state.error && <p role="alert" className="text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">
        <PhoneIcon /> {pending ? "भेजा जा रहा है…" : "कॉल-बैक माँगें"}
      </button>
    </form>
  );
}
