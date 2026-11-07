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

export type Check = {
  rule: "AGE" | "MARITAL" | "BPL" | "SHG" | "PREGNANCY" | "DISTRICT";
  label: { hi: string; en: string };
  result: "MET" | "NOT_MET" | "UNKNOWN";
};
export type Match = { verdict: "LIKELY" | "MAYBE" | "NO"; checks: Check[] };

const MARITAL: Record<Marital, { hi: string; en: string }> = {
  MARRIED: { hi: "विवाहित", en: "married" },
  WIDOW: { hi: "विधवा", en: "widow" },
  UNMARRIED: { hi: "अविवाहित", en: "unmarried" },
  SEPARATED: { hi: "तलाकशुदा / परित्यक्ता", en: "divorced / separated" },
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
      rule: "AGE",
      label:
        rules.maxAge !== undefined
          ? { hi: `उम्र ${min} से ${max} वर्ष`, en: `Age ${min} to ${max}` }
          : { hi: `उम्र ${min} वर्ष या अधिक`, en: `Age ${min} or above` },
      result: a.age >= min && a.age <= max ? "MET" : "NOT_MET",
    });
  }
  if (rules.marital?.length) {
    checks.push({
      rule: "MARITAL",
      label: {
        hi: rules.marital.map((m) => MARITAL[m].hi).join(" या "),
        en: rules.marital.map((m) => MARITAL[m].en).join(" or "),
      },
      result: rules.marital.includes(a.marital) ? "MET" : "NOT_MET",
    });
  }
  if (rules.bpl !== undefined) {
    checks.push({
      rule: "BPL",
      label: rules.bpl ? { hi: "BPL राशन कार्ड हो", en: "Has a BPL ration card" } : { hi: "BPL कार्ड न हो", en: "No BPL card" },
      result: yesNo(a.bpl, rules.bpl),
    });
  }
  if (rules.shg !== undefined) {
    checks.push({
      rule: "SHG",
      label: { hi: "पंजीकृत स्वयं सहायता समूह (SHG) की सदस्य", en: "Member of a registered self-help group" },
      result: yesNo(a.shg, rules.shg),
    });
  }
  if (rules.pregnancy?.length) {
    const onlyFirst = rules.pregnancy.includes("FIRST") && !rules.pregnancy.includes("LATER");
    const onlyLater = rules.pregnancy.includes("LATER") && !rules.pregnancy.includes("FIRST");
    checks.push({
      rule: "PREGNANCY",
      label: onlyLater
        ? { hi: "गर्भवती (दूसरा बच्चा)", en: "Pregnant (second child)" }
        : onlyFirst
          ? { hi: "गर्भवती (पहला बच्चा)", en: "Pregnant (first child)" }
          : { hi: "गर्भवती", en: "Pregnant" },
      result: a.pregnancy !== "NO" && rules.pregnancy.includes(a.pregnancy) ? "MET" : "NOT_MET",
    });
  }
  if (districts.length) {
    checks.push({
      rule: "DISTRICT",
      label: { hi: "आपके ज़िले में लागू", en: "Available in your district" },
      result: districts.includes(a.district) ? "MET" : "NOT_MET",
    });
  }

  const verdict = checks.some((c) => c.result === "NOT_MET")
    ? "NO"
    : checks.some((c) => c.result === "UNKNOWN")
      ? "MAYBE"
      : "LIKELY";
  return { verdict, checks };
}
