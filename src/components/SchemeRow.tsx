import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NeedIcon } from "./icons";

type Props = { code: string; title: string; benefit: string; need: string; summary: string };

// One line in the schemes register: what it is, what she gets, one line why.
export function SchemeRow({ code, title, benefit, need, summary }: Props) {
  return (
    <li>
      <Link prefetch={false} href={`/schemes/${code}`} className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-4 hover:bg-paper">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <NeedIcon need={need} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-display)] text-[1.2rem] font-semibold leading-snug">{title}</span>
          <span className="block font-semibold text-accent">{benefit}</span>
          <span className="block truncate text-[0.95rem] text-muted">{summary}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
