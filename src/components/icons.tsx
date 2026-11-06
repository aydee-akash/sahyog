// Plain line icons (inline SVG, no icon font, nothing to download on 3G).
const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function NeedIcon({ need, className = "size-6" }: { need: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
      {need === "PENSION" && (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 9h.01M18 15h.01" />
        </>
      )}
      {need === "LIVELIHOOD" && (
        <>
          <path d="M4 20V10l8-5 8 5v10" />
          <path d="M9 20v-6h6v6" />
        </>
      )}
      {need === "HEALTH" && <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />}
      {need === "HOUSEHOLD" && (
        <>
          <path d="M6 14c0-3 2.5-5 6-9 3.5 4 6 6 6 9a6 6 0 0 1-12 0Z" />
          <path d="M10 16a2 2 0 0 0 4 0" />
        </>
      )}
    </svg>
  );
}

export function ArrowIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}
