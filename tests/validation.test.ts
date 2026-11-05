import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { donorDetailsSchema } from "@/lib/validation";
import { financialYear, formatReceiptNo } from "@/lib/fy";
import { rupeesInWords } from "@/lib/money";
import { chargeMock, TEST_CARDS, TEST_UPI } from "@/lib/payments";

const valid = {
  idempotencyKey: randomUUID(),
  campaignSlug: "maa-swasthya",
  amount: "1500",
  frequency: "ONE_TIME",
  donorName: "Anita Verma",
  donorEmail: "Anita@Example.com ",
  donorPan: "abcpv 1234k",
  donorAddress: "12 Shivaji Nagar, Bhopal",
};

describe("donor details validation", () => {
  it("normalises PAN and email", () => {
    const r = donorDetailsSchema.parse(valid);
    expect(r.donorPan).toBe("ABCPV1234K");
    expect(r.donorEmail).toBe("anita@example.com");
    expect(r.amount).toBe(1500);
  });
  it("rejects malformed PAN, tiny and fractional amounts", () => {
    expect(donorDetailsSchema.safeParse({ ...valid, donorPan: "ABCDE12345" }).success).toBe(false);
    expect(donorDetailsSchema.safeParse({ ...valid, donorPan: "ABCZE1234F" }).success).toBe(false); // Z is not a holder type
    expect(donorDetailsSchema.safeParse({ ...valid, amount: "50" }).success).toBe(false);
    expect(donorDetailsSchema.safeParse({ ...valid, amount: "150.5" }).success).toBe(false);
  });
});

describe("financial year", () => {
  it("rolls over on 1 April IST, not UTC", () => {
    expect(financialYear(new Date("2027-03-31T18:00:00Z"))).toBe("2026-27"); // 31 Mar 11:30pm IST
    expect(financialYear(new Date("2027-03-31T18:31:00Z"))).toBe("2027-28"); // 1 Apr 00:01 IST
    expect(financialYear(new Date("2026-11-09T06:00:00Z"))).toBe("2026-27");
  });
  it("formats receipt numbers with zero padding", () => {
    expect(formatReceiptNo("CAT/80G", "2026-27", 42)).toBe("CAT/80G/2026-27/000042");
  });
});

describe("amount in words (Indian system)", () => {
  it.each([
    [1500, "Rupees One Thousand Five Hundred Only"],
    [100000, "Rupees One Lakh Only"],
    [1234567, "Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only"],
  ])("%i", (n, words) => expect(rupeesInWords(n)).toBe(words));
});

describe("mock gateway", () => {
  it("blocks foreign cards with an FCRA notice", () => {
    const r = chargeMock({ method: "CARD", cardNumber: TEST_CARDS.foreign });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("FOREIGN_CARD");
  });
  it("accepts the Indian test card and success UPI, declines the failure UPI", () => {
    expect(chargeMock({ method: "CARD", cardNumber: TEST_CARDS.success }).ok).toBe(true);
    expect(chargeMock({ method: "UPI", upiId: TEST_UPI.success }).ok).toBe(true);
    expect(chargeMock({ method: "UPI", upiId: TEST_UPI.failure }).ok).toBe(false);
  });
});
