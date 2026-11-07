"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { runMonthlyCharges } from "@/app/actions/admin";

export function RunMonthly({ due }: { due: number }) {
  const [result, setResult] = useState<{ mandates: number; receipts: string[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <button
        onClick={() =>
          start(async () => {
            setError("");
            try {
              setResult(await runMonthlyCharges());
            } catch {
              setError("चलाने में दिक्कत आई। दोबारा कोशिश करें।");
            }
          })
        }
        disabled={pending}
        className="btn-primary justify-self-start"
      >
        <Play className="size-4" aria-hidden /> {pending ? "चल रहा है…" : due ? `${due} बाकी किस्तें चलाएँ` : "अभी चलाएँ"}
      </button>
      {error && <p role="alert" className="text-bad">{error}</p>}
      {result && (
        <p role="status" className="rounded-xl bg-ok-soft p-3 text-ok">
          {result.receipts.length ? `${result.receipts.length} नई रसीदें: ${result.receipts.join(", ")}` : "कोई किस्त बाकी नहीं थी।"}
        </p>
      )}
    </div>
  );
}
