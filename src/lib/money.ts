const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

// Indian numbering: crore, lakh, thousand, hundred.
export function rupeesInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("amount must be a non-negative integer");
  if (amount === 0) return "Rupees Zero Only";
  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1000);
  const rest = amount % 1000;
  const parts = [
    crore ? `${crore > 99 ? rupeesInWords(crore).replace(/^Rupees | Only$/g, "") : twoDigits(crore)} Crore` : "",
    lakh ? `${twoDigits(lakh)} Lakh` : "",
    thousand ? `${twoDigits(thousand)} Thousand` : "",
    rest ? threeDigits(rest) : "",
  ];
  return `Rupees ${parts.filter(Boolean).join(" ")} Only`;
}

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}
