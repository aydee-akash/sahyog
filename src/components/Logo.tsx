// Two hands holding a sprout: the trust's mark, drawn as a plain SVG.
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="20" fill="var(--color-accent)" />
      <path d="M20 27v-9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 19c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5Z" fill="#fff" />
      <path d="M20 21c0-3.2-2.4-5.2-5.6-5.2 0 3.2 2.4 5.2 5.6 5.2Z" fill="var(--color-haldi)" />
      <path d="M10 25.5c2.6 0 4.6 1.5 6.2 2.8 1.2 1 2.4 1.2 3.8 1.2s2.6-.2 3.8-1.2c1.6-1.3 3.6-2.8 6.2-2.8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
