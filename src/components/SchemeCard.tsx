import Link from "next/link";
import { NeedIcon, ArrowIcon } from "./icons";
import { needLabel } from "@/lib/content";
import { DICTS, Lang } from "@/lib/i18n";

type Props = { code: string; title: string; benefit: string; need: string; summary: string; lang: Lang };

export function SchemeCard({ code, title, benefit, need, summary, lang }: Props) {
  return (
    <Link
      href={`/schemes/${code}`}
      className="card group flex flex-col gap-3 p-5 transition-[border-color,box-shadow] hover:border-accent hover:shadow-[0_10px_30px_-18px_rgba(138,59,18,0.45)]"
    >
      <span className="flex items-center gap-2 text-[0.9rem] text-muted">
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
          <NeedIcon need={need} className="size-5" />
        </span>
        {needLabel(need, lang)}
      </span>
      <h3 className="text-xl font-bold leading-snug">{title}</h3>
      <p className="text-lg font-semibold text-accent-strong">{benefit}</p>
      <p className="line-clamp-2 text-muted">{summary}</p>
      <span className="mt-auto inline-flex items-center gap-1 font-semibold text-accent">
        {DICTS[lang].card.details} <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
