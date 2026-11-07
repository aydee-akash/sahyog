import { prisma } from "./db";

export const MAX_FAILED_LOGINS = 5;
export const WINDOW_MINUTES = 15;

// DB-backed so it holds across serverless instances.
export async function loginBlocked(email: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - WINDOW_MINUTES * 60_000);
  const failed = await prisma.loginAttempt.count({ where: { key: email, ok: false, createdAt: { gte: since } } });
  return failed >= MAX_FAILED_LOGINS;
}

export async function recordLogin(email: string, ok: boolean) {
  await prisma.loginAttempt.create({ data: { key: email, ok } });
}
