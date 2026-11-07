"use client";

import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";

// Reads the scheme aloud with the phone's own voice (no download, no server).
// For women who find reading hard. Hidden if the browser cannot speak.
export function ListenButton({ text, lang, labels }: { text: string; lang: "hi" | "en"; labels: { listen: string; stop: string } }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);
  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 0.9;
    const voice = synth.getVoices().find((v) => v.lang.startsWith(lang === "hi" ? "hi" : "en-IN"));
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={speaking} className="btn-secondary">
      {speaking ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
      {speaking ? labels.stop : labels.listen}
    </button>
  );
}
