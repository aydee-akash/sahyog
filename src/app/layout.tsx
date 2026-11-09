import type { Metadata, Viewport } from "next";
import { Eczar, Mukta } from "next/font/google";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { logout } from "@/app/actions/auth";
import { TRUST } from "@/lib/trust";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { LangSwitch } from "@/components/LangSwitch";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Headings only: a Devanagari-native serif with a printed, sturdy feel.
const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["devanagari", "latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "सहयोग (Sahyog)", template: "%s | सहयोग" },
  description: "मध्य प्रदेश की महिलाओं के लिए सरकारी योजनाएँ आसान हिंदी में, और ट्रस्ट को दान।",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, { lang, t }] = await Promise.all([getSession(), getT()]);
  const navLink = "rounded-lg px-3 py-2 hover:bg-accent-soft";
  return (
    <html lang={lang} className={`${mukta.variable} ${eczar.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
          {t.skip}
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5" aria-label={lang === "hi" ? "मुख्य" : "Main"}>
            <Link prefetch={false} href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold text-accent">
              <Logo />
              {t.brand}
            </Link>
            <div className="flex items-center gap-1 text-[0.95rem]">
              <Link prefetch={false} href="/finder" className={`${navLink} hidden sm:block`}>{t.nav.finder}</Link>
              <Link prefetch={false} href="/donate" className={`${navLink} hidden font-semibold text-accent sm:block`}>{t.nav.donate}</Link>
              {session?.role === "ADMIN" && <Link prefetch={false} href="/admin" className={navLink}>{t.nav.admin}</Link>}
              {session?.role === "DONOR" && <Link prefetch={false} href="/account" className={`${navLink} hidden sm:block`}>{t.nav.account}</Link>}
              {!session && <Link prefetch={false} href="/login" className={`${navLink} hidden sm:block`}>{t.nav.login}</Link>}
              <LangSwitch lang={lang} />
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
        <main id="main" className="mx-auto min-w-0 max-w-6xl px-4 pb-24 pt-6 sm:pb-16">
          {children}
        </main>
        <footer className="border-t border-line bg-paper pb-20 sm:pb-0">
          <div className="mx-auto grid max-w-6xl gap-2 px-4 py-8 text-[0.9rem] text-muted">
            <p>
              <strong className="text-ink">{t.footer.helpline}: {TRUST.helpline}</strong>
              <br />
              {t.footer.hours}
            </p>
            <p>{lang === "hi" ? TRUST.nameHi : TRUST.nameEn}, {TRUST.city}</p>
            <p>{t.footer.noTrackers} {t.footer.disclaimer}</p>
          </div>
        </footer>
        <BottomNav lang={lang} loggedIn={!!session && session.role === "DONOR"} />
      </body>
    </html>
  );
}
