import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import Link from "next/link";
import { Languages, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { logout } from "@/app/actions/auth";
import { setLang } from "@/app/actions/lang";
import { TRUST } from "@/lib/trust";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "सहयोग · Sahyog", template: "%s · सहयोग" },
  description: "मध्य प्रदेश की महिलाओं के लिए सरकारी योजनाएँ आसान हिंदी में, और ट्रस्ट को दान।",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#fbf8f3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, { lang, t }] = await Promise.all([getSession(), getT()]);
  const navLink = "rounded-lg px-3 py-2 hover:bg-accent-soft";
  return (
    <html lang={lang} className={mukta.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
          {t.skip}
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5" aria-label={lang === "hi" ? "मुख्य" : "Main"}>
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-accent-strong">
              <Logo />
              {t.brand}
            </Link>
            <div className="flex items-center gap-1 text-[0.95rem]">
              <Link href="/finder" className={`${navLink} hidden sm:block`}>{t.nav.finder}</Link>
              <Link href="/donate" className={`${navLink} hidden font-semibold text-accent sm:block`}>{t.nav.donate}</Link>
              {session?.role === "ADMIN" && <Link href="/admin" className={navLink}>{t.nav.admin}</Link>}
              {session?.role === "DONOR" && <Link href="/account" className={`${navLink} hidden sm:block`}>{t.nav.account}</Link>}
              {!session && <Link href="/login" className={`${navLink} hidden sm:block`}>{t.nav.login}</Link>}
              <form action={setLang}>
                <input type="hidden" name="lang" value={lang === "hi" ? "en" : "hi"} />
                <button className="chip min-h-10 gap-1.5 px-3 text-[0.9rem]" aria-label={t.nav.switchLabel} lang={lang === "hi" ? "en" : "hi"}>
                  <Languages className="size-4" aria-hidden />
                  {t.nav.switchTo}
                </button>
              </form>
              {session && (
                <form action={logout}>
                  <button className="grid size-10 place-items-center rounded-lg text-muted hover:bg-accent-soft" aria-label={t.nav.logout} title={t.nav.logout}>
                    <LogOut className="size-5" aria-hidden />
                  </button>
                </form>
              )}
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pb-16">
          {children}
        </main>
        <footer className="border-t border-line pb-20 sm:pb-0">
          <div className="mx-auto grid max-w-6xl gap-2 px-4 py-8 text-[0.9rem] text-muted">
            <p>
              <strong className="text-ink">{t.footer.helpline} {TRUST.helpline}</strong> · {t.footer.hours}
            </p>
            <p>{lang === "hi" ? TRUST.nameHi : TRUST.nameEn}, {TRUST.city}. {t.footer.noTrackers}</p>
            <p>{t.footer.disclaimer}</p>
          </div>
        </footer>
        <BottomNav lang={lang} loggedIn={!!session && session.role === "DONOR"} />
      </body>
    </html>
  );
}
