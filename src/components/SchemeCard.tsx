import Link from "next/link";
import { NeedIcon, ArrowIcon } from "./icons";
import { needHi } from "@/lib/content";

type Props = { code: string; titleHi: string; benefitHi: string; need: string; summaryHi: string };

export function SchemeCard({ code, titleHi, benefitHi, need, summaryHi }: Props) {
  return (
    <Link
      href={`/schemes/${code}`}
      className="card group flex flex-col gap-3 p-5 transition-colors hover:border-accent"
    >
      <span className="flex items-center gap-2 text-[0.9rem] text-muted">
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
          <NeedIcon need={need} className="size-5" />
        </span>
        {needHi(need)}
      </span>
      <h3 className="text-xl font-bold leading-snug">{titleHi}</h3>
      <p className="text-lg font-semibold text-accent-strong">{benefitHi}</p>
      <p className="line-clamp-2 text-muted">{summaryHi}</p>
      <span className="mt-auto inline-flex items-center gap-1 font-semibold text-accent">
        पूरी जानकारी <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
