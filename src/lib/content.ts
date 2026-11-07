import type { Lang } from "./i18n";

// Display labels shared by public and admin screens.
export const NEEDS = [
  { key: "PENSION", hi: "पेंशन", en: "Pension" },
  { key: "LIVELIHOOD", hi: "रोज़गार और लोन", en: "Work & loans" },
  { key: "HEALTH", hi: "स्वास्थ्य", en: "Health" },
  { key: "HOUSEHOLD", hi: "घर-परिवार", en: "Household" },
] as const;

// ASSUMPTION: the brief says "9 districts of Madhya Pradesh" but not which.
export const DISTRICTS = [
  { key: "BHOPAL", hi: "भोपाल", en: "Bhopal" },
  { key: "SEHORE", hi: "सीहोर", en: "Sehore" },
  { key: "RAISEN", hi: "रायसेन", en: "Raisen" },
  { key: "VIDISHA", hi: "विदिशा", en: "Vidisha" },
  { key: "RAJGARH", hi: "राजगढ़", en: "Rajgarh" },
  { key: "NARMADAPURAM", hi: "नर्मदापुरम", en: "Narmadapuram" },
  { key: "BETUL", hi: "बैतूल", en: "Betul" },
  { key: "HARDA", hi: "हरदा", en: "Harda" },
  { key: "DEWAS", hi: "देवास", en: "Dewas" },
] as const;

export const needHi = (k: string) => NEEDS.find((n) => n.key === k)?.hi ?? k;
export const districtHi = (k: string) => DISTRICTS.find((d) => d.key === k)?.hi ?? k;
export const needLabel = (k: string, lang: Lang) => NEEDS.find((n) => n.key === k)?.[lang] ?? k;
export const districtLabel = (k: string, lang: Lang) => DISTRICTS.find((d) => d.key === k)?.[lang] ?? k;

export const STATUS_HI: Record<string, string> = {
  DRAFT: "ड्राफ़्ट",
  IN_REVIEW: "समीक्षा में",
  PUBLISHED: "प्रकाशित",
};

export function formatDateHi(d: Date): string {
  return d.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function formatDate(d: Date, lang: Lang): string {
  return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Picks the English field when the page is in English and it has content. */
export function pick<T extends string | string[]>(lang: Lang, hiValue: T, enValue: T): T {
  if (lang === "en" && (Array.isArray(enValue) ? enValue.length : enValue.trim())) return enValue;
  return hiValue;
}
