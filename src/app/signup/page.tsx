import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/lang";
import { getSession } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "खाता बनाएँ / Sign up" };

export default async function SignupPage() {
  const [{ lang, t }, session] = await Promise.all([getT(), getSession()]);
  if (session) redirect(session.role === "ADMIN" ? "/admin" : "/account");
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-6">
      <div>
        <h1 className="text-[2rem]">{t.signup.title}</h1>
        <p className="text-muted">{t.signup.lead}</p>
      </div>
      <SignupForm lang={lang} />
      <p className="text-center">
        {t.signup.have} <Link prefetch={false} href="/login" className="font-semibold text-accent underline">{t.login.title}</Link>
      </p>
    </div>
  );
}
