import { Languages } from "lucide-react";
import { setLang } from "@/app/actions/lang";
import type { Lang } from "@/lib/i18n";

const OPTIONS: { value: Lang; label: string; short: string; aria: string }[] = [
  { value: "hi", label: "हिंदी", short: "हि", aria: "हिंदी में देखें" },
  { value: "en", label: "English", short: "EN", aria: "View in English" },
];

// Both languages always visible, the current one highlighted. A plain form
// post, so it works even before JavaScript loads on a slow phone.
export function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <form action={setLang} className="flex items-center gap-1.5">
      <Languages className="hidden size-4 text-muted sm:block" aria-hidden />
      <div role="group" aria-label="भाषा / Language" className="flex rounded-full bg-paper p-0.5 ring-1 ring-line">
        {OPTIONS.map((o) => {
          const active = o.value === lang;
          return (
            <button
              key={o.value}
              name="lang"
              value={o.value}
              aria-pressed={active}
              aria-label={o.aria}
              lang={o.value}
              disabled={active}
              className={`min-h-9 min-w-11 rounded-full px-3 text-[0.9rem] transition-colors ${
                active ? "bg-accent font-semibold text-white" : "text-ink hover:bg-accent-soft"
              }`}
            >
              <span className="sm:hidden">{o.short}</span>
              <span className="hidden sm:inline">{o.label}</span>
            </button>
          );
        })}
      </div>
    </form>
  );
}
