// Icons from lucide-react (tree-shaken SVGs, nothing extra to download on 3G).
import { Check, Flame, HandCoins, HeartPulse, Phone, Sprout, type LucideProps } from "lucide-react";

const NEED_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  PENSION: HandCoins,
  LIVELIHOOD: Sprout,
  HEALTH: HeartPulse,
  HOUSEHOLD: Flame,
};

export function NeedIcon({ need, className = "size-6" }: { need: string; className?: string }) {
  const Icon = NEED_ICONS[need] ?? HandCoins;
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}


export function CheckIcon({ className = "size-5" }: { className?: string }) {
  return <Check className={className} aria-hidden strokeWidth={2.2} />;
}

export function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return <Phone className={className} aria-hidden strokeWidth={2} />;
}
