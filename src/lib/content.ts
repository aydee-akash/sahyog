// Display labels shared by public and admin screens.
export const NEEDS = [
  { key: "PENSION", hi: "पेंशन", en: "Pension" },
  { key: "LIVELIHOOD", hi: "रोज़गार और लोन", en: "Livelihood" },
  { key: "HEALTH", hi: "स्वास्थ्य", en: "Health" },
  { key: "HOUSEHOLD", hi: "घर-परिवार", en: "Household" },
] as const;

// ASSUMPTION: the brief says "9 districts of Madhya Pradesh" but not which.
export const DISTRICTS = [
  { key: "BHOPAL", hi: "भोपाल" },
  { key: "SEHORE", hi: "सीहोर" },
  { key: "RAISEN", hi: "रायसेन" },
  { key: "VIDISHA", hi: "विदिशा" },
  { key: "RAJGARH", hi: "राजगढ़" },
  { key: "NARMADAPURAM", hi: "नर्मदापुरम" },
  { key: "BETUL", hi: "बैतूल" },
  { key: "HARDA", hi: "हरदा" },
  { key: "DEWAS", hi: "देवास" },
] as const;

export const needHi = (k: string) => NEEDS.find((n) => n.key === k)?.hi ?? k;
export const districtHi = (k: string) => DISTRICTS.find((d) => d.key === k)?.hi ?? k;

export const STATUS_HI: Record<string, string> = {
  DRAFT: "ड्राफ़्ट",
  IN_REVIEW: "समीक्षा में",
  PUBLISHED: "प्रकाशित",
};

export function formatDateHi(d: Date): string {
  return d.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}
