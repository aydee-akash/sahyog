"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Inbox, LayoutDashboard, Megaphone, PhoneCall, ReceiptIndianRupee } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "डैशबोर्ड", en: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/schemes", label: "योजनाएँ", en: "Schemes", Icon: BookOpenText },
  { href: "/admin/donations", label: "दान और रसीदें", en: "Donations", Icon: ReceiptIndianRupee },
  { href: "/admin/campaigns", label: "अभियान", en: "Campaigns", Icon: Megaphone },
  { href: "/admin/callbacks", label: "कॉल-बैक", en: "Call-backs", Icon: PhoneCall },
  { href: "/admin/outbox", label: "आउटबॉक्स", en: "Outbox", Icon: Inbox },
];

export function AdminSidebar({ counts }: { counts: { callbacks: number; review: number } }) {
  const path = usePathname();
  return (
    <nav aria-label="एडमिन" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:sticky lg:top-20 lg:flex-col">
        {ITEMS.map(({ href, label, en, Icon, exact }) => {
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
                <span>{label}</span>
                <span className="hidden text-[0.8rem] text-muted xl:inline">{en}</span>
                {badge > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-[0.75rem] font-semibold text-white">{badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
