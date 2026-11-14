// Kenyan-inspired decorative SVGs. All aria-hidden; they carry mood, not meaning.
// Kitenge patterns here are geometric abstractions (chevrons, concentric rings,
// dots), not reproductions of any specific textile.

/** A thin kitenge-inspired ribbon of alternating chevrons and dotted diamonds.
 *  Repeats horizontally via SVG pattern. Use between sections as a divider. */
export function KitengeDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 24" width="100%" height="24" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="kitenge-tile" x="0" y="0" width="80" height="24" patternUnits="userSpaceOnUse">
            {/* Chevron */}
            <path d="M0 12 L10 4 L20 12 L10 20 Z" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.55" />
            {/* Center diamond with dot */}
            <path d="M40 4 L52 12 L40 20 L28 12 Z" fill="none" stroke="var(--clay)" strokeWidth="1.2" opacity="0.7" />
            <circle cx="40" cy="12" r="2.2" fill="var(--clay)" opacity="0.75" />
            {/* Mirror chevron */}
            <path d="M60 12 L70 4 L80 12 L70 20 Z" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.55" />
            {/* Tiny dots */}
            <circle cx="25" cy="12" r="1.1" fill="var(--accent)" opacity="0.5" />
            <circle cx="55" cy="12" r="1.1" fill="var(--accent)" opacity="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="24" fill="url(#kitenge-tile)" />
      </svg>
    </div>
  );
}

/** A broad, soft kitenge wash to sit behind the hero. Low opacity, not loud. */
export function KitengeBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="kitenge-hero" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          {/* Concentric rings */}
          <circle cx="60" cy="60" r="36" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.14" />
          <circle cx="60" cy="60" r="24" fill="none" stroke="var(--clay)" strokeWidth="1" opacity="0.22" />
          <circle cx="60" cy="60" r="12" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.18" />
          <circle cx="60" cy="60" r="3" fill="var(--clay)" opacity="0.28" />
          {/* Corner diamonds */}
          <path d="M0 60 L12 48 L24 60 L12 72 Z" fill="none" stroke="var(--clay)" strokeWidth="1" opacity="0.22" />
          <path d="M96 60 L108 48 L120 60 L108 72 Z" fill="none" stroke="var(--clay)" strokeWidth="1" opacity="0.22" />
          <path d="M60 0 L72 12 L60 24 L48 12 Z" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.18" />
          <path d="M60 96 L72 108 L60 120 L48 108 Z" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.18" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="800" height="400" fill="url(#kitenge-hero)" />
    </svg>
  );
}

/** Acacia-tree horizon for behind the live-stats row. Silhouette, not photo. */
export function AcaciaHorizon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-x-0 bottom-0 w-full ${className}`}
      aria-hidden="true"
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Rising sun */}
      <defs>
        <radialGradient id="sun-glow" cx="50%" cy="100%" r="55%">
          <stop offset="0%" stopColor="var(--clay)" stopOpacity="0.5" />
          <stop offset="60%" stopColor="var(--clay)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--clay)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="600" cy="170" r="110" fill="url(#sun-glow)" />
      <circle cx="600" cy="170" r="36" fill="var(--clay)" opacity="0.28" />

      {/* Ground line */}
      <path d="M0 162 Q 300 158 600 160 T 1200 162 L 1200 180 L 0 180 Z" fill="var(--accent)" opacity="0.14" />

      {/* Left acacia */}
      <g opacity="0.55" transform="translate(220 90)">
        <path d="M0 72 L0 20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <path d="M0 20 L-12 8 M0 20 L10 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <ellipse cx="-2" cy="4" rx="26" ry="8" fill="var(--accent)" />
        <ellipse cx="-2" cy="1" rx="20" ry="4" fill="var(--accent)" />
      </g>
      {/* Right acacia, further and smaller */}
      <g opacity="0.45" transform="translate(920 100)">
        <path d="M0 62 L0 18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M0 18 L-9 7 M0 18 L8 5" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <ellipse cx="-1" cy="3" rx="20" ry="6" fill="var(--accent)" />
      </g>
      {/* A tiny third tree far back */}
      <g opacity="0.3" transform="translate(140 118)">
        <path d="M0 44 L0 14" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="0" cy="2" rx="12" ry="4" fill="var(--accent)" />
      </g>
    </svg>
  );
}

/** A centred rising-sun glow for a hero number. Softer than the acacia horizon. */
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
      {/* A thin ring, like a horizon-caught halo */}
      <ellipse cx="400" cy="270" rx="200" ry="200" fill="none" stroke="var(--clay)" strokeWidth="1" opacity="0.18" />
      <ellipse cx="400" cy="270" rx="130" ry="130" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.14" />
    </svg>
  );
}

/** A single kitenge-style stripe used inside the "piloting in Kenya" chip. */
export function KitengeStripe({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 10" width="24" height="10" className={className} aria-hidden="true">
      <circle cx="3" cy="5" r="1.4" fill="var(--accent)" />
      <path d="M8 5 L11 2 L14 5 L11 8 Z" fill="var(--clay)" opacity="0.9" />
      <circle cx="18" cy="5" r="1.4" fill="var(--accent)" />
    </svg>
  );
}
