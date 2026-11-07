"use client";

import { useCallback, useState } from "react";

// A plain busy flag for buttons that call a server action. Unlike useTransition,
// it clears as soon as the action returns, even while the revalidated page is
// still streaming in (useTransition stayed pending in that case).
export function useBusy(): [boolean, (fn: () => Promise<void>) => Promise<void>] {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);
  return [busy, run];
}
