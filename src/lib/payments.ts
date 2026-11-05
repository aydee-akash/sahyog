// Mock payment gateway (test mode). Mirrors how a real gateway behaves closely
// enough to exercise success, decline and the FCRA foreign-card block.
export type GatewayResult =
  | { ok: true; ref: string }
  | { ok: false; code: "DECLINED" | "FOREIGN_CARD" | "INVALID"; message: string };

export const TEST_CARDS = {
  success: "4111 1111 1111 1111",
  declined: "4000 0000 0000 0002",
  foreign: "4000 0566 5566 5556",
};
export const TEST_UPI = { success: "success@testupi", failure: "failure@testupi" };

// ASSUMPTION: the gateway tells us the card's issuing country from its BIN.
// We simulate that with a small list of test BINs issued outside India.
const FOREIGN_TEST_BINS = ["400005", "555555", "378282"];

function luhn(num: string): boolean {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function chargeMock(input: { method: "UPI" | "CARD"; upiId?: string; cardNumber?: string }): GatewayResult {
  const ref = `test_pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  if (input.method === "UPI") {
    const upi = (input.upiId ?? "").trim().toLowerCase();
    if (!/^[\w.-]{2,}@[a-z]{2,}$/.test(upi)) return { ok: false, code: "INVALID", message: "UPI ID सही नहीं है" };
    if (upi === TEST_UPI.failure) return { ok: false, code: "DECLINED", message: "भुगतान अस्वीकार हुआ। दोबारा कोशिश करें।" };
    return { ok: true, ref };
  }
  const card = (input.cardNumber ?? "").replace(/\D/g, "");
  if (card.length < 15 || card.length > 19 || !luhn(card)) {
    return { ok: false, code: "INVALID", message: "कार्ड नंबर सही नहीं है" };
  }
  if (FOREIGN_TEST_BINS.some((bin) => card.startsWith(bin))) {
    return {
      ok: false,
      code: "FOREIGN_CARD",
      message:
        "विदेशी कार्ड से दान अभी स्वीकार नहीं है। विदेशी धन के लिए FCRA खाता चाहिए। कृपया भारतीय कार्ड या UPI का उपयोग करें।",
    };
  }
  if (card === TEST_CARDS.declined.replace(/\D/g, "")) {
    return { ok: false, code: "DECLINED", message: "बैंक ने भुगतान अस्वीकार किया। दूसरा कार्ड या UPI आज़माएँ।" };
  }
  return { ok: true, ref };
}
