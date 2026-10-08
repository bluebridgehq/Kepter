export function CheckIcon({ size = 16, stroke = 2.2 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5l3.2 3L13 4.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function ScanIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  );
}

/** The Kepter tag mark. */
export function LogoMark({
  size = 30,
  body = "var(--color-brand)",
  dot = "var(--color-accent)",
}: {
  size?: number | string;
  body?: string;
  dot?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 9.5A3.5 3.5 0 0 1 7.5 6h11.3a3.5 3.5 0 0 1 2.47 1.03l6.2 6.2a3.5 3.5 0 0 1 0 4.95l-8.3 8.3a3.5 3.5 0 0 1-4.95 0l-9.2-9.2A3.5 3.5 0 0 1 4 14.8V9.5Z"
        fill={body}
      />
      <circle cx="11" cy="12.5" r="2.4" fill={dot} />
    </svg>
  );
}
