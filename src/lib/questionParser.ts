import type { Answers } from "./eligibility";
import { DISTRICTS } from "./content";

export type PartialAnswers = Partial<Answers>;

// Rules-based reader for a free-text question in Hindi or English. Used when
// the AI is unavailable, and to cross-check the AI. Every value it fills is
// shown back to the woman to confirm before matching.
const DISTRICT_WORDS: Record<string, string[]> = {
  BHOPAL: ["भोपाल", "bhopal"],
  SEHORE: ["सीहोर", "sehore"],
  RAISEN: ["रायसेन", "raisen"],
  VIDISHA: ["विदिशा", "vidisha"],
  RAJGARH: ["राजगढ़", "राजगढ", "rajgarh"],
  NARMADAPURAM: ["नर्मदापुरम", "होशंगाबाद", "narmadapuram", "hoshangabad"],
  BETUL: ["बैतूल", "betul"],
  HARDA: ["हरदा", "harda"],
  DEWAS: ["देवास", "dewas"],
};

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
function normaliseDigits(s: string) {
  return s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

export function parseQuestion(raw: string): PartialAnswers {
  const t = normaliseDigits(raw.toLowerCase());
  const a: PartialAnswers = {};

  const age = t.match(/(\d{2,3})\s*(साल|वर्ष|बरस|सा|year|yr|y\/o|years)/) ?? t.match(/(?:उम्र|आयु|age)\D{0,8}(\d{2,3})/);
  if (age) {
    const n = Number(age[1]);
    if (n >= 14 && n <= 110) a.age = n;
  }

  if (has(t, ["विधवा", "पति नहीं रहे", "पति की मृत्यु", "पति गुज़र", "पति गुजर", "widow", "husband died", "husband passed"])) a.marital = "WIDOW";
  else if (has(t, ["तलाक", "परित्यक्ता", "छोड़ दिया", "छोड़ दिया", "अलग रहती", "divorce", "separated", "abandoned"])) a.marital = "SEPARATED";
  else if (has(t, ["अविवाहित", "शादी नहीं", "unmarried", "not married"])) a.marital = "UNMARRIED";
  else if (has(t, ["विवाहित", "शादीशुदा", "मेरे पति", "पति ", "married", "my husband"])) a.marital = "MARRIED";

  if (has(t, ["बीपीएल नहीं", "bpl नहीं", "गरीबी रेखा कार्ड नहीं", "no bpl", "not bpl"])) a.bpl = "NO";
  else if (has(t, ["बीपीएल", "bpl", "गरीबी रेखा", "पीला कार्ड", "अंत्योदय"])) a.bpl = "YES";

  if (has(t, ["समूह की सदस्य नहीं", "shg नहीं", "not in shg", "no shg"])) a.shg = "NO";
  else if (has(t, ["स्वयं सहायता समूह", "समूह से जुड़ी", "shg", "self help group", "self-help group"])) a.shg = "YES";

  if (has(t, ["गर्भवती", "पेट से", "प्रेग्नेंट", "pregnant", "expecting"])) {
    a.pregnancy = has(t, ["दूसरा", "दूसरी", "तीसरा", "second", "third", "पहले से बच्चा", "already have"]) ? "LATER" : has(t, ["पहला", "पहली", "first"]) ? "FIRST" : undefined;
    if (!a.pregnancy) a.pregnancy = "FIRST";
  } else if (has(t, ["गर्भवती नहीं", "not pregnant"])) a.pregnancy = "NO";

  for (const [key, words] of Object.entries(DISTRICT_WORDS)) {
    if (has(t, words) && DISTRICTS.some((d) => d.key === key)) {
      a.district = key;
      break;
    }
  }
  return a;
}
