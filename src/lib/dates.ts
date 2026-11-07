// Monthly mandates charge on the same day each month, clamped to month end.
export function addMonth(d: Date): Date {
  const n = new Date(d);
  const day = n.getUTCDate();
  n.setUTCDate(1);
  n.setUTCMonth(n.getUTCMonth() + 1);
  const last = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
  n.setUTCDate(Math.min(day, last)); // 31 Jan → 28/29 Feb, not 3 Mar
  return n;
}
