"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { loginBlocked, recordLogin, WINDOW_MINUTES } from "@/lib/rateLimit";
import { sendMock } from "@/lib/outbox";
import { getLang } from "@/lib/lang";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

// Only allow same-site relative redirects after login.
function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

async function startSession(user: { id: string; role: "DONOR" | "ADMIN"; name: string; email: string }) {
  const token = await signSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const en = (await getLang()) === "en";
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: en ? "Enter a valid email and password." : "ईमेल और पासवर्ड सही लिखें।" };
  const { email, password } = parsed.data;

  if (await loginBlocked(email)) {
    return {
      error: en
        ? `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.`
        : `बहुत बार गलत पासवर्ड। ${WINDOW_MINUTES} मिनट बाद कोशिश करें।`,
    };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = !!user && (await bcrypt.compare(password, user.passwordHash));
  await recordLogin(email, ok);
  if (!ok || !user) return { error: en ? "Wrong email or password." : "ईमेल या पासवर्ड गलत है।" };

  await startSession(user);
  redirect(safeNext(parsed.data.next, user.role === "ADMIN" ? "/admin" : "/account"));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

// --- Donor sign-up with an emailed one-time code (email is mocked) ---------

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export type SignupState = { step: "details" | "code"; email?: string; testCode?: string; error?: string };

/** One action, two steps: "details" sends a code, "code" verifies it. */
export async function signup(prev: SignupState, form: FormData): Promise<SignupState> {
  return form.get("step") === "code" ? signupVerify(prev, form) : signupStart(form);
}

async function signupStart(form: FormData): Promise<SignupState> {
  const en = (await getLang()) === "en";
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const f = parsed.error.issues[0].path[0];
    const msg =
      f === "password" ? (en ? "Password must be at least 8 characters." : "पासवर्ड कम से कम 8 अक्षर का हो।")
      : f === "email" ? (en ? "Enter a valid email." : "सही ईमेल लिखें।")
      : en ? "Enter your full name." : "पूरा नाम लिखें।";
    return { step: "details", error: msg };
  }
  const { name, email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    return { step: "details", error: en ? "An account with this email already exists. Please log in." : "इस ईमेल से खाता पहले से है। लॉग इन करें।" };
  }
  const code = String(randomInt(100000, 1000000));
  await prisma.otpCode.deleteMany({ where: { email } });
  await prisma.otpCode.create({
    data: {
      email,
      name,
      codeHash: await bcrypt.hash(code, 8),
      passwordHash: await bcrypt.hash(password, 10),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  await sendMock({ to: email, subject: "आपका सहयोग कोड / Your Sahyog code", body: `Code: ${code}. Valid for 10 minutes.` });
  // Test mode only: the code is shown on screen because email is mocked.
  return { step: "code", email, testCode: code };
}

async function signupVerify(prev: SignupState, form: FormData): Promise<SignupState> {
  const en = (await getLang()) === "en";
  const email = String(form.get("email") ?? prev.email ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").trim();
  const otp = await prisma.otpCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5) {
    return { step: "details", error: en ? "The code expired. Please start again." : "कोड की समय-सीमा खत्म हो गई। फिर से शुरू करें।" };
  }
  if (!(await bcrypt.compare(code, otp.codeHash))) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ...prev, step: "code", error: en ? "Wrong code." : "कोड गलत है।" };
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email, name: otp.name, passwordHash: otp.passwordHash, role: "DONOR" } });
    // Email is now verified, so earlier guest donations with it are theirs.
    await tx.donation.updateMany({ where: { donorEmail: email, userId: null }, data: { userId: u.id } });
    await tx.otpCode.deleteMany({ where: { email } });
    return u;
  });
  await startSession(user);
  redirect("/account");
}
