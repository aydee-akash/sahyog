"use client";

import { useEffect, useState } from "react";
import { DICTS, Lang } from "@/lib/i18n";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const [lang, setLang] = useState<Lang>("hi");
  useEffect(() => setLang(document.documentElement.lang === "en" ? "en" : "hi"), []);
  const t = DICTS[lang].common;
  return (
    <div role="alert" className="mx-auto grid max-w-md justify-items-start gap-4 py-12">
      <h1 className="text-2xl">{t.error}</h1>
      <p className="text-muted">{t.errorLead}</p>
      <button onClick={reset} className="btn-primary">{t.retry}</button>
    </div>
  );
}
