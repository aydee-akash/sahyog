"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, CircleHelp, ListChecks, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { DISTRICTS } from "@/lib/content";
import { DICTS, Lang } from "@/lib/i18n";
import { FinderMatch, findSchemes, requestCallback, understand } from "@/app/actions/finder";
import { AskBox } from "@/components/AskBox";
import { ArrowIcon, CheckIcon, NeedIcon, PhoneIcon } from "@/components/icons";
import { TRUST } from "@/lib/trust";

type Answers = { age?: number; marital?: string; bpl?: string; shg?: string; pregnancy?: string; district?: string };
type Key = keyof Answers;
type Via = "QUESTIONS" | "AI_TEXT" | "VOICE";

const ORDER: Key[] = ["age", "marital", "bpl", "shg", "pregnancy", "district"];

function options(key: Key, lang: Lang): { v: string; l: string }[] {
  const o = DICTS[lang].finder.opt;
  switch (key) {
    case "marital":
      return (["MARRIED", "WIDOW", "SEPARATED", "UNMARRIED"] as const).map((v) => ({ v, l: o[v] }));
    case "bpl":
    case "shg":
      return (["YES", "NO", "UNSURE"] as const).map((v) => ({ v, l: o[v] }));
    case "pregnancy":
      return [
        { v: "FIRST", l: o.FIRST },
        { v: "LATER", l: o.LATER },
        { v: "NO", l: o.NOT_PREGNANT },
      ];
    case "district":
      return DISTRICTS.map((d) => ({ v: d.key, l: d[lang] }));
    default:
      return [];
  }
}

function display(key: Key, value: string | number, lang: Lang): string {
  if (key === "age") return `${value} ${DICTS[lang].finder.years}`;
  return options(key, lang).find((o) => o.v === value)?.l ?? String(value);
}

export function Finder({ lang, initialQuery, initialVia }: { lang: Lang; initialQuery?: string; initialVia: "AI_TEXT" | "VOICE" }) {
  const t = DICTS[lang].finder;
  const [phase, setPhase] = useState<"intro" | "confirm" | "questions" | "results">("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [source, setSource] = useState<"AI" | "RULES" | null>(null);
  const [via, setVia] = useState<Via>("QUESTIONS");
  const [queue, setQueue] = useState<Key[]>(ORDER);
  const [idx, setIdx] = useState(0);
  const [age, setAge] = useState("");
  const [ageError, setAgeError] = useState("");
  const [matches, setMatches] = useState<FinderMatch[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ran = useRef(false);

  function ask(text: string, how: "AI_TEXT" | "VOICE") {
    setError("");
    start(async () => {
      const res = await understand(text);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAnswers(res.answers as Answers);
      setSource(res.source);
      setVia(how);
      setPhase("confirm");
    });
  }

  useEffect(() => {
    if (initialQuery && !ran.current) {
      ran.current = true;
      ask(initialQuery, initialVia);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(final: Answers) {
    setError("");
    start(async () => {
      const res = await findSchemes(final, via);
      if (res.ok) {
        setMatches(res.matches);
        setPhase("results");
        window.scrollTo({ top: 0 });
      } else setError(res.error);
    });
  }

  function beginQuestions(current: Answers) {
    const missing = ORDER.filter((k) => current[k] === undefined);
    if (missing.length === 0) return run(current);
    setQueue(missing);
    setIdx(0);
    setAge(current.age ? String(current.age) : "");
    setPhase("questions");
  }

  function answer(key: Key, value: string | number) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (idx < queue.length - 1) setIdx(idx + 1);
    else run(next);
  }

  function submitAge(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(age);
    if (!Number.isInteger(n) || n < 14 || n > 110) return setAgeError(t.ageError);
    setAgeError("");
    answer("age", n);
  }

  function restart() {
    setPhase("intro");
    setAnswers({});
    setSource(null);
    setVia("QUESTIONS");
    setAge("");
    setMatches([]);
    window.history.replaceState(null, "", "/finder");
  }

  if (phase === "results") return <Results matches={matches} district={answers.district!} lang={lang} onRestart={restart} />;

  if (phase === "intro") {
    return (
      <div className="mx-auto grid max-w-xl gap-6">
        <div className="grid gap-2">
          <h1 className="text-[1.9rem] font-bold leading-tight">{t.aiTitle}</h1>
          <p className="text-muted">{t.aiHint}</p>
        </div>
        <AskBox lang={lang} onAsk={ask} busy={pending} defaultValue={initialQuery} />
        {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}
        <div className="flex items-center gap-3 text-muted" aria-hidden>
          <span className="h-px flex-1 bg-line" /> {t.orStep} <span className="h-px flex-1 bg-line" />
        </div>
        <button onClick={() => beginQuestions({})} className="btn-secondary">
          <ListChecks className="size-5" aria-hidden /> {t.start}
        </button>
        <p className="text-[0.9rem] text-muted">{t.privacy}</p>
      </div>
    );
  }

  if (phase === "confirm") {
    const found = ORDER.filter((k) => answers[k] !== undefined);
    return (
      <div className="fade-up mx-auto grid max-w-xl gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-[1.75rem] font-bold">{t.understood}</h1>
          <span className="ai-badge">
            {source === "AI" ? <Sparkles className="size-3.5" aria-hidden /> : <Bot className="size-3.5" aria-hidden />}
            {source === "AI" ? t.aiBadge : t.rulesBadge}
          </span>
        </div>
        {found.length === 0 ? (
          <p className="rounded-xl bg-warn-soft p-3 text-warn">{t.nothingUnderstood}</p>
        ) : (
          <>
            <p className="text-muted">{t.understoodNote}</p>
            <ul className="ai-ring grid divide-y divide-line rounded-2xl">
              {found.map((k) => (
                <li key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block text-[0.85rem] text-muted">{t.field[k]}</span>
                    <span className="font-semibold">{display(k, answers[k]!, lang)}</span>
                  </span>
                  <button
                    onClick={() => setAnswers((a) => ({ ...a, [k]: undefined }))}
                    className="btn-ghost min-h-11 px-3 text-[0.95rem]"
                    aria-label={`${t.change}: ${t.field[k]}`}
                  >
                    <Pencil className="size-4" aria-hidden /> {t.change}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}
        <button onClick={() => beginQuestions(answers)} disabled={pending} className="btn-primary">
          {pending ? t.searching : t.continue} <ArrowIcon />
        </button>
        <button onClick={restart} className="btn-ghost justify-self-start"><RotateCcw className="size-4" aria-hidden /> {t.restart}</button>
      </div>
    );
  }

  const key = queue[idx];
  const opts = options(key, lang);
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="grid gap-2">
        <p className="text-[0.95rem] text-muted" aria-live="polite">
          {t.question} {idx + 1} {t.of} {queue.length}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {queue.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <h1 key={key} className="fade-up text-[1.75rem] font-bold leading-snug" id="q">{t.q[key]}</h1>

      {key === "age" ? (
        <form onSubmit={submitAge} className="grid gap-3" aria-labelledby="q">
          <label htmlFor="age" className="sr-only">{t.ageLabel}</label>
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
            <span className="text-lg">{t.years}</span>
          </div>
          {ageError && <p id="age-err" className="text-bad">{ageError}</p>}
          <button className="btn-primary justify-self-start">{t.next} <ArrowIcon /></button>
        </form>
      ) : (
        <div className={`grid gap-3 ${opts.length > 4 ? "grid-cols-2" : ""}`} role="group" aria-labelledby="q">
          {opts.map((o) => (
            <button
              key={o.v}
              onClick={() => answer(key, o.v)}
              disabled={pending}
              className={`btn-secondary min-h-14 justify-start text-left text-lg ${answers[key] === o.v ? "chip-on" : ""}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      {pending && <p aria-live="polite" className="text-muted">{t.searching}</p>}
      {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}

      {idx > 0 && !pending && (
        <button onClick={() => setIdx(idx - 1)} className="btn-ghost justify-self-start">{t.back}</button>
      )}
      <p className="text-[0.9rem] text-muted">{t.privacy}</p>
    </div>
  );
}

function Results({ matches, district, lang, onRestart }: { matches: FinderMatch[]; district: string; lang: Lang; onRestart: () => void }) {
  const t = DICTS[lang].finder;
  return (
    <div className="fade-up mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <h1 className="text-[1.75rem] font-bold">{matches.length ? t.resultsCount(matches.length) : t.noResults}</h1>
        <p className="flex gap-2 rounded-xl bg-warn-soft p-3 text-warn">
          <CircleHelp className="mt-1 size-5 shrink-0" aria-hidden /> {t.disclaimer}
        </p>
      </div>

      {matches.length === 0 && <p className="text-muted">{t.noResultsHint}</p>}

      <ul className="grid gap-4">
        {matches.map((m) => (
          <li key={m.code} className="card grid gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <NeedIcon need={m.need} className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">{lang === "en" ? m.titleEn : m.titleHi}</h2>
                  <p className="font-semibold text-accent-strong">{lang === "en" && m.benefitEn ? m.benefitEn : m.benefitHi}</p>
                </div>
              </div>
              <span className={`badge ${m.verdict === "LIKELY" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
                {m.verdict === "LIKELY" ? t.likely : t.maybe}
              </span>
            </div>
            <ul className="grid gap-1 rounded-xl bg-paper p-3 text-[0.95rem]" aria-label={t.rulesChecked}>
              <li className="text-[0.85rem] font-semibold text-muted">{t.rulesChecked}</li>
              {m.checks.length === 0 && <li className="text-muted">{t.noRules}</li>}
              {m.checks.map((c) => (
                <li key={c.rule} className="flex items-center gap-2">
                  {c.result === "MET" ? (
                    <CheckIcon className="size-5 text-ok" />
                  ) : (
                    <span aria-hidden className="grid size-5 place-items-center font-bold text-warn">?</span>
                  )}
                  <span>{c.label[lang]}</span>
                  <span className="sr-only">{c.result === "MET" ? t.met : t.unknown}</span>
                </li>
              ))}
            </ul>
            <Link href={`/schemes/${m.code}?district=${district}`} className="btn-secondary justify-self-start">
              {t.docsHow} <ArrowIcon />
            </Link>
          </li>
        ))}
      </ul>

      <Callback district={district} codes={matches.map((m) => m.code)} lang={lang} />

      <button onClick={onRestart} className="btn-ghost justify-self-start"><RotateCcw className="size-4" aria-hidden /> {t.restart}</button>
    </div>
  );
}

function Callback({ district, codes, lang }: { district: string; codes: string[]; lang: Lang }) {
  const t = DICTS[lang].finder;
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ done?: boolean; error?: string }>({});
  const [pending, start] = useTransition();

  if (state.done) {
    return (
      <div className="card fade-up flex items-center gap-3 bg-ok-soft p-5 text-ok" role="status">
        <CheckIcon /> {t.thanks}
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
      <h2 className="text-xl font-bold">{t.talk}</h2>
      <p className="text-muted">
        {t.talkLead}{" "}
        <a href={`tel:${TRUST.helpline.replace(/\D/g, "")}`} className="font-semibold text-accent">{TRUST.helpline}</a>
      </p>
      <label htmlFor="phone" className="label">{t.mobile}</label>
      <input
        id="phone"
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="input"
        aria-invalid={!!state.error}
      />
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1.5 size-5 accent-[#8a3b12]" />
        <span>{t.consent}</span>
      </label>
      {state.error && <p role="alert" className="text-bad">{state.error}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">
        <PhoneIcon /> {pending ? t.sending : t.callback}
      </button>
    </form>
  );
}
