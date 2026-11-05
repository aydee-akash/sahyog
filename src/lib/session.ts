import { SignJWT, jwtVerify } from "jose";

export type Session = { userId: string; role: "DONOR" | "ADMIN"; name: string; email: string };

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 8;

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(secret);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

// Guest donors get a signed link to their own receipt instead of an account.
export async function signReceiptToken(donationId: string): Promise<string> {
  return new SignJWT({ d: donationId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(key());
}

export async function verifyReceiptToken(token: string | null | undefined, donationId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.d === donationId;
  } catch {
    return false;
  }
}
