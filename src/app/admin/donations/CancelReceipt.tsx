"use client";

import { useActionState, useEffect, useRef } from "react";
import { cancelReceiptAction } from "@/app/actions/admin";

// Cancelling needs a written reason and a second look, in a native dialog.
export function CancelReceipt({ receiptId, number }: { receiptId: string; number: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(cancelReceiptAction, {});
  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state.ok]);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="text-bad underline">रद्द करें</button>
      <dialog ref={ref} className="m-auto w-[min(92vw,28rem)] rounded-2xl p-0 backdrop:bg-black/40">
        <form action={action} className="grid gap-3 p-5">
          <h2 className="text-lg font-bold">रसीद {number} रद्द करें?</h2>
          <p className="text-[0.95rem] text-muted">नंबर बना रहेगा और दोबारा इस्तेमाल नहीं होगा। PDF पर &ldquo;CANCELLED&rdquo; लिखा जाएगा और यह Form 10BD में नहीं जाएगी।</p>
          <input type="hidden" name="receiptId" value={receiptId} />
          <label className="grid gap-1">
            <span className="font-semibold">कारण</span>
            <input name="reason" required minLength={5} maxLength={300} className="input" placeholder="जैसे: दानदाता को रिफ़ंड किया गया" />
          </label>
          {state.error && <p role="alert" className="text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="btn-secondary">वापस</button>
            <button disabled={pending} className="btn bg-bad text-white hover:bg-bad/90">{pending ? "रद्द हो रही है…" : "रसीद रद्द करें"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
