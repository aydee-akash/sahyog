// Deterministic eligibility rules. The finder never promises eligibility: it
// returns "likely" / "maybe" matches with the exact rules it checked.

export type Marital = "MARRIED" | "WIDOW" | "UNMARRIED" | "SEPARATED";
export type YesNo = "YES" | "NO" | "UNSURE";
export type Pregnancy = "FIRST" | "LATER" | "NO";

export type Answers = {
  age: number;
  marital: Marital;
  bpl: YesNo;
  shg: YesNo;
  pregnancy: Pregnancy;
  district: string;
};

export type Rules = {
  minAge?: number;
  maxAge?: number;
  marital?: Marital[];
  bpl?: boolean;
  shg?: boolean;
  pregnancy?: Exclude<Pregnancy, "NO">[];
};

export type Check = { label: string; result: "MET" | "NOT_MET" | "UNKNOWN" };
export type Match = { verdict: "LIKELY" | "MAYBE" | "NO"; checks: Check[] };

const MARITAL_HI: Record<Marital, string> = {
  MARRIED: "विवाहित",
  WIDOW: "विधवा",
  UNMARRIED: "अविवाहित",
  SEPARATED: "तलाकशुदा / परित्यक्ता",
};

function yesNo(answer: YesNo, required: boolean): Check["result"] {
  if (answer === "UNSURE") return "UNKNOWN";
  return (answer === "YES") === required ? "MET" : "NOT_MET";
}

export function evaluate(rules: Rules, districts: string[], a: Answers): Match {
  const checks: Check[] = [];

  if (rules.minAge !== undefined || rules.maxAge !== undefined) {
    const min = rules.minAge ?? 0;
    const max = rules.maxAge ?? 120;
    checks.push({
      label: rules.maxAge !== undefined ? `उम्र ${min} से ${max} वर्ष` : `उम्र ${min} वर्ष या अधिक`,
      result: a.age >= min && a.age <= max ? "MET" : "NOT_MET",
    });
  }
  if (rules.marital?.length) {
    checks.push({
      label: rules.marital.map((m) => MARITAL_HI[m]).join(" या "),
      result: rules.marital.includes(a.marital) ? "MET" : "NOT_MET",
    });
  }
  if (rules.bpl !== undefined) {
    checks.push({ label: rules.bpl ? "BPL राशन कार्ड हो" : "BPL कार्ड ज़रूरी नहीं", result: yesNo(a.bpl, rules.bpl) });
  }
  if (rules.shg !== undefined) {
    checks.push({ label: "पंजीकृत स्वयं सहायता समूह (SHG) की सदस्य", result: yesNo(a.shg, rules.shg) });
  }
  if (rules.pregnancy?.length) {
    checks.push({
      label: rules.pregnancy.includes("LATER") && !rules.pregnancy.includes("FIRST")
        ? "गर्भवती (दूसरा बच्चा)"
        : rules.pregnancy.includes("FIRST") && !rules.pregnancy.includes("LATER")
          ? "गर्भवती (पहला बच्चा)"
          : "गर्भवती",
      result: a.pregnancy !== "NO" && rules.pregnancy.includes(a.pregnancy) ? "MET" : "NOT_MET",
    });
  }
  if (districts.length) {
    checks.push({ label: "आपके ज़िले में लागू", result: districts.includes(a.district) ? "MET" : "NOT_MET" });
  }

  const verdict = checks.some((c) => c.result === "NOT_MET")
    ? "NO"
    : checks.some((c) => c.result === "UNKNOWN")
      ? "MAYBE"
      : "LIKELY";
  return { verdict, checks };
}
