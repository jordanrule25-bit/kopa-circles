// Signature marks and hand-drawn ink details. The "Circle of Five" dot cluster
// stands in for Kopa's whole mechanic — five people, one circle. All marks sit
// slightly off a perfect circle so the hand shows.

/** Five dots arranged in a loose circle. The signature Kopa mark.
 *  Dots sit 1–2px off the perfect-circle position; sizes vary by half a pixel.
 *  Two dots carry the clay tone, three the acacia tone, so it reads as people,
 *  not a pattern. Pass `size`, `className`, and optionally `title` for a11y. */
export function CircleOfFive({ size = 44, className = "", title }: { size?: number; className?: string; title?: string }) {
  // Hand-nudged positions around a center at (24,24), radius ~17.
  // Angles 90°, 162°, 234°, 306°, 18° (starting top, going clockwise).
  const dots = [
    { cx: 24.2, cy: 6.4, r: 3.1, c: "var(--accent)" },   // top
    { cx: 41.3, cy: 19.8, r: 2.9, c: "var(--clay)" },    // upper-right
    { cx: 34.6, cy: 40.7, r: 3.3, c: "var(--accent)" },  // lower-right
    { cx: 13.1, cy: 40.2, r: 2.9, c: "var(--clay)" },    // lower-left
    { cx: 6.7, cy: 19.1, r: 3.2, c: "var(--accent)" },   // upper-left
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} />
      ))}
    </svg>
  );
}

/** A monochrome Circle-of-Five for header / inline use. Same hand drawing. */
export function CircleOfFiveMono({ size = 22, className = "" }: { size?: number; className?: string }) {
  const dots = [
    { cx: 24.2, cy: 6.4, r: 3.1 },
    { cx: 41.3, cy: 19.8, r: 2.9 },
    { cx: 34.6, cy: 40.7, r: 3.3 },
    { cx: 13.1, cy: 40.2, r: 2.9 },
    { cx: 6.7, cy: 19.1, r: 3.2 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="currentColor" />
      ))}
    </svg>
  );
}

/** A single wavering ink hairline across the width. The signature divider. */
export function HandRule({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <svg viewBox="0 0 800 6" width="100%" height="6" preserveAspectRatio="none">
        {/* Slight Bezier variation reads as an ink line drawn by a person,
            not a CSS border. Opacity keeps it quiet between sections. */}
        <path
          d="M0 3 C 120 2.1, 220 3.6, 320 2.8 S 520 3.8, 640 2.6 S 760 3.4, 800 2.9"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}

/** A hand-drawn italic serif small-cap rule-label. Use as the kicker above
 *  a headline, or as a section label where "label" caps feel too tech. */
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`kicker text-sm sm:text-base ${className}`}>{children}</span>;
}

/** An acacia-tree horizon silhouette for backdrop use. Kept from earlier.
 *  Used sparingly in the editorial design — only behind the live-impact row. */
export function AcaciaHorizon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-x-0 bottom-0 w-full ${className}`}
      aria-hidden="true"
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <radialGradient id="acacia-sun" cx="50%" cy="100%" r="55%">
          <stop offset="0%" stopColor="var(--clay)" stopOpacity="0.42" />
          <stop offset="60%" stopColor="var(--clay)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="600" cy="170" r="110" fill="url(#acacia-sun)" />
      <circle cx="600" cy="170" r="30" fill="var(--clay)" opacity="0.26" />
      <path d="M0 162 Q 300 158 600 160 T 1200 162 L 1200 180 L 0 180 Z" fill="var(--accent)" opacity="0.14" />
      <g opacity="0.55" transform="translate(220 90)">
        <path d="M0 72 L0 20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <path d="M0 20 L-12 8 M0 20 L10 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <ellipse cx="-2" cy="4" rx="26" ry="8" fill="var(--accent)" />
        <ellipse cx="-2" cy="1" rx="20" ry="4" fill="var(--accent)" />
      </g>
      <g opacity="0.45" transform="translate(920 100)">
        <path d="M0 62 L0 18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M0 18 L-9 7 M0 18 L8 5" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <ellipse cx="-1" cy="3" rx="20" ry="6" fill="var(--accent)" />
      </g>
      <g opacity="0.3" transform="translate(140 118)">
        <path d="M0 44 L0 14" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="0" cy="2" rx="12" ry="4" fill="var(--accent)" />
      </g>
    </svg>
  );
}

/** A centred rising-sun glow for a hero number. Kept from Report page. */
export function SunGlow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="sun-glow-center" cx="50%" cy="68%" r="55%">
          <stop offset="0%" stopColor="var(--clay)" stopOpacity="0.32" />
          <stop offset="55%" stopColor="var(--clay)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="400" cy="260" rx="360" ry="200" fill="url(#sun-glow-center)" />
      <ellipse cx="400" cy="270" rx="200" ry="200" fill="none" stroke="var(--clay)" strokeWidth="1" opacity="0.18" />
      <ellipse cx="400" cy="270" rx="130" ry="130" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.14" />
    </svg>
  );
}
