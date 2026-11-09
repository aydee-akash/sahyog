"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelReceiptAction } from "@/app/actions/admin";

type Target = { receiptId: string; number: string };
const EVENT = "sahyog:cancel-receipt";

// Row trigger: tiny and stateless, so it can disappear once the receipt is
// cancelled without taking the in-flight request with it.
export function CancelReceiptButton(target: Target) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent<Target>(EVENT, { detail: target }))} className="text-bad underline">
      रद्द करें
    </button>
  );
}

// One dialog per page. It stays mounted while the page refreshes, so the
// action result always arrives. Cancelling needs a written reason.
export function CancelReceiptDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [state, action, pending] = useActionState(cancelReceiptAction, {});
  const [handled, setHandled] = useState<unknown>(null);

  useEffect(() => {
    const open = (e: Event) => {
      setTarget((e as CustomEvent<Target>).detail);
      ref.current?.showModal();
    };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  useEffect(() => {
    if (state.ok && handled !== state) {
      setHandled(state);
      ref.current?.close();
    }
  }, [state, handled]);

  return (
    <dialog ref={ref} className="m-auto w-[min(92vw,28rem)] rounded-2xl p-0 backdrop:bg-black/40" onClose={() => setTarget(null)}>
      {target && (
        <form key={target.receiptId} action={action} className="grid gap-3 p-5">
          <h2 className="text-lg">रसीद {target.number} रद्द करें?</h2>
          <p className="text-[0.95rem] text-muted">नंबर बना रहेगा और दोबारा इस्तेमाल नहीं होगा। PDF पर &ldquo;CANCELLED&rdquo; लिखा जाएगा और यह Form 10BD में नहीं जाएगी।</p>
          <input type="hidden" name="receiptId" value={target.receiptId} />
          <label className="grid gap-1">
            <span className="font-semibold">कारण</span>
            <input name="reason" required minLength={5} maxLength={300} className="input" placeholder="जैसे: दानदाता को रिफ़ंड किया गया" />
          </label>
          {state.error && !pending && <p role="alert" className="text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="btn-secondary">वापस</button>
            <button disabled={pending} className="btn bg-bad text-white hover:bg-bad/90">{pending ? "रद्द हो रही है…" : "रसीद रद्द करें"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
