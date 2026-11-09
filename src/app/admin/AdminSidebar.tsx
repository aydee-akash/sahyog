"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Inbox, LayoutDashboard, Megaphone, PhoneCall, ReceiptIndianRupee } from "lucide-react";
import { DICTS, Lang } from "@/lib/i18n";

const ITEMS = [
  { href: "/admin", key: "dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/schemes", key: "schemes", Icon: BookOpenText },
  { href: "/admin/donations", key: "donations", Icon: ReceiptIndianRupee },
  { href: "/admin/campaigns", key: "campaigns", Icon: Megaphone },
  { href: "/admin/callbacks", key: "callbacks", Icon: PhoneCall },
  { href: "/admin/outbox", key: "outbox", Icon: Inbox },
] as const;

export function AdminSidebar({ lang, counts }: { lang: Lang; counts: { callbacks: number; review: number } }) {
  const path = usePathname();
  const t = DICTS[lang].admin.nav;
  return (
    <nav aria-label={t.aria} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:sticky lg:top-20 lg:flex-col">
        {ITEMS.map(({ href, key, Icon, ...item }) => {
          const exact = "exact" in item && item.exact;
          const active = exact ? path === href : path.startsWith(href);
          const badge = href === "/admin/callbacks" ? counts.callbacks : href === "/admin/schemes" ? counts.review : 0;
          return (
            <li key={href}>
              <Link prefetch={false}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-[0.95rem] ${active ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink hover:bg-card"}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span>{t[key]}</span>
                {lang === "hi" && <span className="hidden text-[0.8rem] text-muted xl:inline">{DICTS.en.admin.nav[key]}</span>}
                {badge > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-[0.75rem] font-semibold text-white">{badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
