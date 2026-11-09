"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelReceiptAction } from "@/app/actions/admin";
import { DICTS, Lang } from "@/lib/i18n";

type Target = { receiptId: string; number: string };
const EVENT = "sahyog:cancel-receipt";

// Row trigger: tiny and stateless, so it can disappear once the receipt is
// cancelled without taking the in-flight request with it.
export function CancelReceiptButton({ lang, ...target }: Target & { lang: Lang }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent<Target>(EVENT, { detail: target }))} className="text-bad underline">
      {DICTS[lang].admin.cancel.button}
    </button>
  );
}

// One dialog per page. It stays mounted while the page refreshes, so the
// action result always arrives. Cancelling needs a written reason.
export function CancelReceiptDialog({ lang }: { lang: Lang }) {
  const t = DICTS[lang].admin.cancel;
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
          <h2 className="text-lg">{t.title(target.number)}</h2>
          <p className="text-[0.95rem] text-muted">{t.lead}</p>
          <input type="hidden" name="receiptId" value={target.receiptId} />
          <label className="grid gap-1">
            <span className="font-semibold">{t.reason}</span>
            <input name="reason" required minLength={5} maxLength={300} className="input" placeholder={t.placeholder} />
          </label>
          {state.error && !pending && <p role="alert" className="text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="btn-secondary">{t.back}</button>
            <button disabled={pending} className="btn bg-bad text-white hover:bg-bad/90">{pending ? t.cancelling : t.confirm}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
