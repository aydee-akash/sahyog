import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { TRUST } from "@/lib/trust";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "सहयोग: महिलाओं के लिए योजनाएँ", template: "%s · सहयोग" },
  description: "मध्य प्रदेश की महिलाओं के लिए सरकारी योजनाएँ आसान हिंदी में, और ट्रस्ट को दान।",
};

export const viewport: Viewport = { themeColor: "#fbf8f3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="hi" className={mukta.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
          मुख्य सामग्री पर जाएँ
        </a>
        <header className="border-b border-line bg-paper/95">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3" aria-label="मुख्य">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-accent-strong">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-accent text-base text-white">स</span>
              सहयोग
            </Link>
            <div className="flex items-center gap-1 text-[0.95rem]">
              <Link href="/finder" className="hidden rounded-lg px-3 py-2 hover:bg-accent-soft sm:block">योजना खोजें</Link>
              <Link href="/donate" className="rounded-lg px-3 py-2 font-semibold text-accent hover:bg-accent-soft">दान करें</Link>
              {session?.role === "ADMIN" && (
                <Link href="/admin/schemes" className="rounded-lg px-3 py-2 hover:bg-accent-soft">एडमिन</Link>
              )}
              {session ? (
                <>
                  {session.role === "DONOR" && (
                    <Link href="/account" className="rounded-lg px-3 py-2 hover:bg-accent-soft">मेरा खाता</Link>
                  )}
                  <form action={logout}>
                    <button className="rounded-lg px-3 py-2 text-muted hover:bg-accent-soft">लॉग आउट</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-accent-soft">लॉग इन</Link>
              )}
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-16 pt-6">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-2 px-4 py-8 text-[0.9rem] text-muted">
            <p>
              <strong className="text-ink">हेल्पलाइन {TRUST.helpline}</strong> · सोमवार–शनिवार, सुबह 10 से शाम 6
            </p>
            <p>{TRUST.nameHi}, {TRUST.city}. इस साइट पर कोई विज्ञापन या ट्रैकर नहीं है।</p>
            <p>योजनाओं की जानकारी केवल मार्गदर्शन के लिए है। अंतिम निर्णय सरकारी विभाग का होता है।</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
