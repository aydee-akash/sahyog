import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, Session, verifySession } from "./session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser(next = "/account"): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login?next=/admin/schemes");
  if (s.role !== "ADMIN") redirect("/");
  return s;
}
