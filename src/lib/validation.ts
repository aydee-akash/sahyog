import { z } from "zod";

// Individual PAN: 5 letters (4th is the holder type), 4 digits, 1 letter.
export const PAN_RE = /^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/;

export function normalisePan(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export const MIN_DONATION = 100;
export const MAX_DONATION = 1_000_000;

export const donorDetailsSchema = z.object({
  idempotencyKey: z.string().uuid(),
  campaignSlug: z.string().min(1).max(80),
  amount: z.coerce
    .number()
    .int("राशि पूरे रुपयों में लिखें")
    .min(MIN_DONATION, `कम से कम ₹${MIN_DONATION}`)
    .max(MAX_DONATION, "₹10 लाख से अधिक के लिए ट्रस्ट से संपर्क करें"),
  frequency: z.enum(["ONE_TIME", "MONTHLY"]),
  donorName: z.string().trim().min(2, "पूरा नाम लिखें").max(100),
  donorEmail: z.string().trim().toLowerCase().email("सही ईमेल लिखें"),
  donorPan: z
    .string()
    .transform(normalisePan)
    .refine((v) => PAN_RE.test(v), "PAN सही नहीं है (जैसे ABCPE1234F)"),
  donorAddress: z.string().trim().min(5, "पता लिखें").max(300),
});

export type DonorDetails = z.infer<typeof donorDetailsSchema>;

export const paymentSchema = z.object({
  donationId: z.string().min(1),
  method: z.enum(["UPI", "CARD"]),
  upiId: z.string().trim().max(80).optional(),
  cardNumber: z.string().max(30).optional(),
});
