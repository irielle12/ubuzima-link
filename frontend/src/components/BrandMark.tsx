/* The app icon (heartbeat pulse into a forward arrow) as inline SVG, so it
   can be recolored/sized via props instead of loading /favicon.svg as a
   flat image. Kept in one place since Landing, Login and HospitalLogin all
   render it. */
function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="brand-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="24" fill="url(#brand-mark-grad)" />
      <path
        d="M18,54 L36,54 L44,30 L52,54 L68,54"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="68,44 87,54 68,64" fill="#fff" />
    </svg>
  );
}

export default BrandMark;
