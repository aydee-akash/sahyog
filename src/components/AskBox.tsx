"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { Mic, MicOff, Search } from "lucide-react";
import { DICTS, Lang } from "@/lib/i18n";
import { useSpeech } from "./useSpeech";

type Props = {
  lang: Lang;
  /** When given, the box hands the text to the caller instead of navigating. */
  onAsk?: (text: string, via: "AI_TEXT" | "VOICE") => void;
  busy?: boolean;
  defaultValue?: string;
};

// The one loud element on the site: a haldi-yellow card where she says her
// situation in her own words, typed or spoken.
export function AskBox({ lang, onAsk, busy, defaultValue = "" }: Props) {
  const t = DICTS[lang];
  const id = useId();
  const router = useRouter();
  const [text, setText] = useState(defaultValue);
  const [spoken, setSpoken] = useState(false);
  const [hint, setHint] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const onText = useCallback((s: string) => {
    setText(s);
    setSpoken(true);
  }, []);
  const speech = useSpeech(lang, onText);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 3) {
      setHint(true);
      fieldRef.current?.focus();
      return;
    }
    setHint(false);
    const via = spoken ? "VOICE" : "AI_TEXT";
    if (onAsk) onAsk(q, via);
    else router.push(`/finder?q=${encodeURIComponent(q)}&via=${via}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[1.25rem] bg-haldi p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-[family-name:var(--font-display)] text-[1.25rem] font-semibold text-ink">
          {t.home.askLabel}
        </label>
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[0.8rem] font-semibold text-ink">AI</span>
      </div>
      <textarea
        id={id}
        ref={fieldRef}
        rows={3}
        aria-describedby={hint ? `${id}-hint` : undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSpoken(false);
          setHint(false);
        }}
        placeholder={t.home.askPlaceholder}
        className="min-h-24 w-full resize-none rounded-xl bg-white px-4 py-3 text-[1.05rem] text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        maxLength={1000}
      />
      {hint && (
        <p id={`${id}-hint`} role="alert" className="rounded-lg bg-white/80 px-3 py-2 font-semibold text-ink">
          {lang === "hi" ? "पहले अपनी बात लिखें या बोलें।" : "Type or speak your situation first."}
        </p>
      )}
      {speech.listening && <p aria-live="polite" className="font-semibold text-ink">{t.finder.listening}</p>}
      {speech.error === "MIC_BLOCKED" && (
        <p role="alert" className="rounded-lg bg-white/80 px-3 py-2 text-[0.95rem] text-bad">
          {lang === "hi" ? "माइक की अनुमति नहीं मिली। लिखकर बताएँ।" : "Microphone permission was denied. Please type instead."}
        </p>
      )}
      <div className="flex gap-2">
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className="btn border border-ink/15 bg-white px-4 text-ink hover:border-ink/40"
            aria-pressed={speech.listening}
          >
            {speech.listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            {t.finder.speak}
          </button>
        )}
        <button disabled={busy} aria-busy={busy} className="btn-primary flex-1 disabled:opacity-100">
          <Search className="size-5" aria-hidden />
          {busy ? t.finder.understanding : t.home.askButton}
        </button>
      </div>
    </form>
  );
}
