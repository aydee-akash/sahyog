"use client";

import { useState } from "react";
import { useBusy } from "@/components/useBusy";
import { Play } from "lucide-react";
import { runMonthlyCharges } from "@/app/actions/admin";
import { DICTS, Lang } from "@/lib/i18n";

export function RunMonthly({ lang, due }: { lang: Lang; due: number }) {
  const t = DICTS[lang].admin.run;
  const [result, setResult] = useState<{ mandates: number; receipts: string[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, run] = useBusy();
  return (
    <div className="grid gap-3">
      <button
        onClick={() =>
          run(async () => {
            setError("");
            try {
              setResult(await runMonthlyCharges());
            } catch {
              setError(t.error);
            }
          })
        }
        disabled={pending}
        className="btn-primary justify-self-start"
      >
        <Play className="size-4" aria-hidden /> {pending ? t.running : due ? t.runDue(due) : t.runNow}
      </button>
      {error && <p role="alert" className="text-bad">{error}</p>}
      {result && (
        <p role="status" className="rounded-xl bg-ok-soft p-3 text-ok">
          {result.receipts.length ? t.done(result.receipts.length, result.receipts.join(", ")) : t.none}
        </p>
      )}
    </div>
  );
}
