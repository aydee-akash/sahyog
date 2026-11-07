import { prisma } from "./db";

// Mock messaging: in production this would call an email/SMS provider. Here
// every message is stored so staff and reviewers can see exactly what was sent.
// dedupeKey makes retries (webhook + redirect racing) send a message once.
export async function sendMock(msg: { to: string; subject: string; body: string; channel?: "EMAIL" | "SMS"; dedupeKey?: string }) {
  try {
    await prisma.outbox.create({ data: { channel: msg.channel ?? "EMAIL", ...msg } });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e; // already sent
  }
}
