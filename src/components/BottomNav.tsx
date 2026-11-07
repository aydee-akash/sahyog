"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandHeart, House, Search, UserRound } from "lucide-react";
import { DICTS, Lang } from "@/lib/i18n";

// App-style tab bar on phones: the four things people come for, one thumb away.
export function BottomNav({ lang, loggedIn }: { lang: Lang; loggedIn: boolean }) {
  const path = usePathname();
  const t = DICTS[lang];
  if (path.startsWith("/admin")) return null;
  const items = [
    { href: "/", label: lang === "hi" ? "होम" : "Home", Icon: House, active: path === "/" || path.startsWith("/schemes") },
    { href: "/finder", label: lang === "hi" ? "खोजें" : "Find", Icon: Search, active: path.startsWith("/finder") },
    { href: "/donate", label: t.nav.donate, Icon: HandHeart, active: path.startsWith("/donate") },
    { href: loggedIn ? "/account" : "/login", label: loggedIn ? t.nav.account : t.nav.login, Icon: UserRound, active: path.startsWith("/account") || path.startsWith("/login") || path.startsWith("/signup") },
  ];
  return (
    <nav aria-label={lang === "hi" ? "मुख्य टैब" : "Main tabs"} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon, active }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] ${active ? "font-semibold text-accent" : "text-muted"}`}
            >
              <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
