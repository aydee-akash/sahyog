"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { DICTS, Lang } from "@/lib/i18n";
import { useSpeech } from "./useSpeech";

type Props = {
  lang: Lang;
  /** When given, the box hands the text to the caller instead of navigating. */
  onAsk?: (text: string, via: "AI_TEXT" | "VOICE") => void;
  busy?: boolean;
  defaultValue?: string;
};

export function AskBox({ lang, onAsk, busy, defaultValue = "" }: Props) {
  const t = DICTS[lang];
  const router = useRouter();
  const [text, setText] = useState(defaultValue);
  const [spoken, setSpoken] = useState(false);
  const onText = useCallback((s: string) => {
    setText(s);
    setSpoken(true);
  }, []);
  const speech = useSpeech(lang, onText);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 3) return;
    const via = spoken ? "VOICE" : "AI_TEXT";
    if (onAsk) onAsk(q, via);
    else router.push(`/finder?q=${encodeURIComponent(q)}&via=${via}`);
  }

  return (
    <form onSubmit={submit} className="ai-ring grid gap-3 rounded-2xl p-4 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.25)]">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="ask" className="font-semibold">{t.home.askLabel}</label>
        <span className="ai-badge"><Sparkles className="size-3.5" aria-hidden /> AI</span>
      </div>
      <textarea
        id="ask"
        rows={2}
        value={text}
        onChange={(e) => { setText(e.target.value); setSpoken(false); }}
        placeholder={t.home.askPlaceholder}
        className="input min-h-20 resize-none border-0 bg-paper text-[1.05rem] focus:ring-2 focus:ring-violet-300"
        maxLength={1000}
      />
      {speech.listening && <p aria-live="polite" className="text-[0.95rem] text-violet-800">{t.finder.listening}</p>}
      {speech.error === "MIC_BLOCKED" && (
        <p role="alert" className="text-[0.9rem] text-bad">{lang === "hi" ? "माइक की अनुमति नहीं मिली। लिखकर बताएँ।" : "Microphone permission was denied. Please type instead."}</p>
      )}
      <div className="flex gap-2">
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className={`btn-secondary px-4 ${speech.listening ? "border-violet-400 bg-violet-50 text-violet-800" : ""}`}
            aria-pressed={speech.listening}
          >
            {speech.listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            {t.finder.speak}
          </button>
        )}
        <button disabled={busy || text.trim().length < 3} className="btn-primary flex-1">
          <Sparkles className="size-5" aria-hidden />
          {busy ? t.finder.understanding : t.home.askButton}
        </button>
      </div>
    </form>
  );
}
