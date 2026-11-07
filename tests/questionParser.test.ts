import { describe, expect, it } from "vitest";
import { parseQuestion } from "@/lib/questionParser";

describe("free-text question reader (AI fallback)", () => {
  it("reads a typical Hindi message", () => {
    expect(parseQuestion("मैं 45 साल की विधवा हूँ, भोपाल में रहती हूँ, बीपीएल कार्ड है")).toEqual({
      age: 45,
      marital: "WIDOW",
      bpl: "YES",
      district: "BHOPAL",
    });
  });

  it("reads Devanagari digits and pregnancy", () => {
    const a = parseQuestion("उम्र २४ वर्ष, मैं गर्भवती हूँ, पहला बच्चा, सीहोर");
    expect(a).toMatchObject({ age: 24, pregnancy: "FIRST", district: "SEHORE" });
  });

  it("handles English and Hinglish", () => {
    expect(parseQuestion("I am 30 years old, my husband died, I live in Dewas, member of SHG")).toMatchObject({
      age: 30,
      marital: "WIDOW",
      district: "DEWAS",
      shg: "YES",
    });
  });

  it("reads negations instead of matching the positive keyword", () => {
    expect(parseQuestion("BPL नहीं है").bpl).toBe("NO");
    expect(parseQuestion("second pregnancy, already have a daughter, pregnant").pregnancy).toBe("LATER");
  });

  it("never guesses: an empty or unrelated message gives no answers", () => {
    expect(parseQuestion("नमस्ते, मदद चाहिए")).toEqual({});
    expect(parseQuestion("my phone number is 9876543210")).toEqual({});
  });

  it("ignores impossible ages", () => {
    expect(parseQuestion("मेरी उम्र 5 साल")).toEqual({});
    expect(parseQuestion("age 150 years").age).toBeUndefined();
  });
});
