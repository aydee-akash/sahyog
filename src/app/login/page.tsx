import Link from "next/link";
import { getT } from "@/lib/lang";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "लॉग इन / Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, { lang, t }] = await Promise.all([searchParams, getT()]);
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-6">
      <div>
        <h1 className="text-[2rem]">{t.login.title}</h1>
        <p className="text-muted">{t.login.lead}</p>
      </div>
      <LoginForm next={next} lang={lang} />
      <p className="text-center">
        {t.login.noAccount} <Link href="/signup" className="font-semibold text-accent underline">{t.login.signup}</Link>
      </p>
      <div className="card p-4 text-[0.9rem] text-muted">
        <p className="font-semibold text-ink">{t.login.demo}</p>
        <p>{t.login.donor}: donor@demo.org</p>
        <p>{t.login.admin}: admin@demo.org</p>
        <p>{t.login.password}: Demo@1234</p>
      </div>
    </div>
  );
}
