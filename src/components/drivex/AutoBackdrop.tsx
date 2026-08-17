/**
 * Ambient automotive backdrop: instrument-cluster arcs, tyre-tread rhythm and
 * a carbon micro-grid. Purely decorative, non-interactive.
 */
export function AutoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* headlight glows */}
      <div className="absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-[22rem] w-[22rem] rounded-full bg-primary/15 blur-[130px]" />
      <div className="absolute bottom-[-8rem] left-1/4 h-[20rem] w-[20rem] rounded-full bg-primary/10 blur-[140px]" />

      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="dx-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path
              d="M34 0H0v34"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-foreground/[0.05]"
            />
          </pattern>
          <pattern
            id="dx-tread"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(28)"
          >
            <rect width="5" height="9" rx="2" className="fill-foreground/[0.05]" />
          </pattern>
          <radialGradient id="dx-fade" cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="dx-mask">
            <rect width="100%" height="100%" fill="url(#dx-fade)" />
          </mask>
        </defs>

        <rect width="100%" height="100%" fill="url(#dx-grid)" />
        <rect width="100%" height="100%" fill="url(#dx-tread)" mask="url(#dx-mask)" />

        {/* instrument cluster arcs, top-right */}
        <g className="text-primary/25" transform="translate(0,0)">
          <g style={{ transformOrigin: "center" }}>
            <circle
              cx="88%"
              cy="112"
              r="150"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 9"
            />
            <circle
              cx="88%"
              cy="112"
              r="118"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="220 600"
              className="text-primary/40"
            />
            <circle
              cx="88%"
              cy="112"
              r="92"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              className="text-foreground/10"
            />
          </g>
        </g>

        {/* speed streaks, bottom-left */}
        <g className="text-foreground/[0.07]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={-40}
              y={`${58 + i * 6}%`}
              width={140 + i * 90}
              height="2"
              rx="1"
              fill="currentColor"
            />
          ))}
        </g>
      </svg>

      {/* vignette so content stays legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
    </div>
  );
}
