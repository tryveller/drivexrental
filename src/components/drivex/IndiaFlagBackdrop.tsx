/**
 * Subtle tricolour wash with a faint Ashoka chakra. Purely decorative — it sits
 * far behind the copy so text stays readable on the language screen.
 */
export function IndiaFlagBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-[0.16]"
        viewBox="0 0 300 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="dx-flag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9933" stopOpacity="0.95" />
            <stop offset="33%" stopColor="#FF9933" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="66%" stopColor="#138808" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#138808" stopOpacity="0.6" />
          </linearGradient>
          <filter id="dx-flag-blur">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <rect width="300" height="200" fill="url(#dx-flag)" filter="url(#dx-flag-blur)" />
        <g
          transform="translate(150 100)"
          fill="none"
          stroke="#0A2E6B"
          strokeOpacity="0.55"
          strokeWidth="1.1"
        >
          <circle r="34" />
          <circle r="4" />
          {Array.from({ length: 24 }, (_, index) => (
            <line
              key={index}
              y2="-34"
              transform={`rotate(${index * 15})`}
              strokeOpacity="0.4"
              strokeWidth="0.8"
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 bg-background/72" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
    </div>
  );
}
