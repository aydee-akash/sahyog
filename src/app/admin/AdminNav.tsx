import Link from "next/link";

export function AdminNav({ active }: { active: "schemes" | "donations" }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} aria-current={active === key ? "page" : undefined} className={`chip ${active === key ? "chip-on" : ""}`}>
      {label}
    </Link>
  );
  return (
    <nav className="flex gap-2" aria-label="एडमिन">
      {item("schemes", "/admin/schemes", "योजनाएँ")}
      {item("donations", "/admin/donations", "दान और रसीदें")}
    </nav>
  );
}
