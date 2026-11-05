import { describe, expect, it } from "vitest";
import { Answers, evaluate } from "@/lib/eligibility";

const base: Answers = { age: 35, marital: "MARRIED", bpl: "NO", shg: "NO", pregnancy: "NO", district: "BHOPAL" };
const widowPension = { minAge: 18, maxAge: 79, marital: ["WIDOW" as const], bpl: true };

describe("eligibility rules", () => {
  it("matches a BPL widow within the age band as LIKELY", () => {
    const m = evaluate(widowPension, [], { ...base, marital: "WIDOW", bpl: "YES" });
    expect(m.verdict).toBe("LIKELY");
    expect(m.checks.every((c) => c.result === "MET")).toBe(true);
  });

  it("returns MAYBE, not a promise, when the woman is unsure about her BPL card", () => {
    const m = evaluate(widowPension, [], { ...base, marital: "WIDOW", bpl: "UNSURE" });
    expect(m.verdict).toBe("MAYBE");
    expect(m.checks.find((c) => c.label.includes("BPL"))?.result).toBe("UNKNOWN");
  });

  it("rejects on age boundaries (80 is outside 18-79, 79 is inside)", () => {
    expect(evaluate(widowPension, [], { ...base, marital: "WIDOW", bpl: "YES", age: 80 }).verdict).toBe("NO");
    expect(evaluate(widowPension, [], { ...base, marital: "WIDOW", bpl: "YES", age: 79 }).verdict).toBe("LIKELY");
  });

  it("only matches first-child maternity for a first pregnancy", () => {
    const rules = { pregnancy: ["FIRST" as const] };
    expect(evaluate(rules, [], { ...base, pregnancy: "FIRST" }).verdict).toBe("LIKELY");
    expect(evaluate(rules, [], { ...base, pregnancy: "LATER" }).verdict).toBe("NO");
    expect(evaluate(rules, [], { ...base, pregnancy: "NO" }).verdict).toBe("NO");
  });

  it("applies district restrictions", () => {
    const rules = { minAge: 18, maxAge: 45 };
    expect(evaluate(rules, ["SEHORE"], base).verdict).toBe("NO");
    expect(evaluate(rules, ["BHOPAL"], base).verdict).toBe("LIKELY");
  });

  it("a NOT_MET rule beats an UNKNOWN one", () => {
    const m = evaluate(widowPension, [], { ...base, marital: "MARRIED", bpl: "UNSURE" });
    expect(m.verdict).toBe("NO");
  });
});
