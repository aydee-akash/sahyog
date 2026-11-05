// Indian financial year runs 1 April to 31 March. Receipts are numbered per FY.
// Dates are evaluated in IST so a 31 March 11:30pm donation lands in the old FY.
export function financialYear(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function formatReceiptNo(prefix: string, fy: string, seq: number): string {
  return `${prefix}/${fy}/${String(seq).padStart(6, "0")}`;
}
