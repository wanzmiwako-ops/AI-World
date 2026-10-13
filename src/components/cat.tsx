import type { CSSProperties } from "react";

export type CatMood = "happy" | "joy" | "love" | "sad" | "neutral" | "sleepy";
export type CatVariant = "mochi" | "boba";

const PALETTE: Record<CatVariant, { body: string; patch: string; stripe?: string }> = {
  // Mochi: kucing biru laut
  mochi: { body: "#9CC9F0", patch: "#FFFFFF" },
  // Boba: kucing oren-krem bergaris
  boba: { body: "#FFE1A8", patch: "#FFF7E6", stripe: "#F5B048" },
};

const INK = "#0B2545";

function Eyes({ mood }: { mood: CatMood }) {
  if (mood === "love") {
    const heart = "M0 4 C -5 0 -5 -5 -2 -5 C -1 -5 0 -4 0 -4 C 0 -4 1 -5 2 -5 C 5 -5 5 0 0 4 Z";
    return (
      <g>
        <path d={heart} transform="translate(45 54) scale(1.9)" fill="#FF7A93" />
        <path d={heart} transform="translate(75 54) scale(1.9)" fill="#FF7A93" />
      </g>
    );
  }
  if (mood === "joy") {
    return (
      <path d="M38 55 Q45 47 52 55 M68 55 Q75 47 82 55" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
    );
  }
  if (mood === "sad" || mood === "sleepy") {
    return (
      <path d="M38 53 Q45 59 52 53 M68 53 Q75 59 82 53" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
    );
  }
  return (
    <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "blink 4.6s infinite" }}>
      <ellipse cx="45" cy="53" rx="6.5" ry="8" fill={INK} />
      <ellipse cx="75" cy="53" rx="6.5" ry="8" fill={INK} />
      <circle cx="47.5" cy="49.5" r="2.4" fill="#fff" />
      <circle cx="77.5" cy="49.5" r="2.4" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: CatMood }) {
  if (mood === "sad") return <path d="M54 72 Q60 67 66 72" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
  if (mood === "neutral" || mood === "sleepy") return <path d="M55 70 L65 70" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
  if (mood === "joy" || mood === "love") return <path d="M53 67 Q60 80 67 67 Z" fill="#FF8FA6" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />;
  return <path d="M53 67 Q56.5 72 60 67 Q63.5 72 67 67" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
}

/**
 * Maskot kucing A&I WORLD. Murni SVG + CSS, jadi aman dipakai di Server Component.
 */
export function Cat({
  variant = "mochi",
  mood = "happy",
  size = 96,
  motion = "bob",
  delay = 0,
  label,
  className,
}: {
  variant?: CatVariant;
  mood?: CatMood;
  size?: number;
  motion?: "bob" | "hop" | "none";
  delay?: number;
  label?: string;
  className?: string;
}) {
  const c = PALETTE[variant];
  const wrap: CSSProperties =
    motion === "none"
      ? {}
      : { animation: `${motion === "hop" ? "hop 1.1s" : "bob 2.6s"} ease-in-out ${delay}s infinite` };

  return (
    <span className={className} style={{ display: "inline-block", lineHeight: 0, ...wrap }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        style={{ overflow: "visible" }}
      >
        {/* ekor */}
        <path
          d="M86 98 C 110 96 114 72 102 62"
          fill="none"
          stroke={c.stripe ?? c.body}
          strokeWidth="10"
          strokeLinecap="round"
          style={{ transformOrigin: "86px 98px", animation: `swish 2.4s ease-in-out ${delay}s infinite` }}
        />
        {/* badan */}
        <ellipse cx="60" cy="96" rx="30" ry="20" fill={c.body} stroke="#fff" strokeWidth="3" />
        <ellipse cx="48" cy="112" rx="8" ry="5" fill={c.patch} stroke="#fff" strokeWidth="2" />
        <ellipse cx="72" cy="112" rx="8" ry="5" fill={c.patch} stroke="#fff" strokeWidth="2" />
        {/* telinga */}
        <g>
          <path d="M26 42 L28 10 L54 28 Z" fill={c.body} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 35 L33 19 L46 29 Z" fill="#FFB3C4" />
        </g>
        <g style={{ transformOrigin: "80px 32px", animation: `twitch 5s ease-in-out ${delay + 1}s infinite` }}>
          <path d="M94 42 L92 10 L66 28 Z" fill={c.body} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          <path d="M88 35 L87 19 L74 29 Z" fill="#FFB3C4" />
        </g>
        {/* kepala */}
        <ellipse cx="60" cy="58" rx="40" ry="34" fill={c.body} stroke="#fff" strokeWidth="3" />
        {c.stripe ? (
          <path d="M52 27 Q55 33 58 27 M62 27 Q65 33 68 27 M57 25 L57 33 M63 25 L63 33" fill="none" stroke={c.stripe} strokeWidth="3" strokeLinecap="round" />
        ) : (
          <ellipse cx="38" cy="36" rx="9" ry="5" fill="#fff" opacity="0.45" transform="rotate(-30 38 36)" />
        )}
        <ellipse cx="60" cy="70" rx="17" ry="11" fill={c.patch} opacity="0.9" />
        {/* pipi */}
        <circle cx="34" cy="67" r="5.5" fill="#FF9FB2" opacity="0.7" />
        <circle cx="86" cy="67" r="5.5" fill="#FF9FB2" opacity="0.7" />
        {/* kumis */}
        <path d="M20 61 L36 64 M20 69 L36 68 M100 61 L84 64 M100 69 L84 68" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
        <Eyes mood={mood} />
        {/* hidung */}
        <path d="M57 62 L63 62 L60 65.5 Z" fill="#FF8FA6" stroke="#FF8FA6" strokeWidth="1.5" strokeLinejoin="round" />
        <Mouth mood={mood} />
        {mood === "sleepy" && (
          <text x="92" y="22" fontFamily="var(--font-display)" fontSize="16" fontWeight="600" fill={INK} opacity="0.6">
            z
          </text>
        )}
      </svg>
    </span>
  );
}

export function Heart({ size = 20, className, beat = true }: { size?: number; className?: string; beat?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={beat ? { animation: "beat 1.6s ease-in-out infinite" } : undefined}
    >
      <path
        d="M12 21s-7.5-4.6-9.6-9C.8 8.6 2.8 4.5 6.6 4.5c2.1 0 3.6 1.3 5.4 3 1.8-1.7 3.3-3 5.4-3 3.8 0 5.8 4.1 4.2 7.5C19.5 16.4 12 21 12 21z"
        fill="#FF7A93"
      />
    </svg>
  );
}

/** Mochi & Boba berdua, dengan hati yang berdenyut di atasnya. */
export function CatPair({
  size = 80,
  motion = "bob",
  moods = ["happy", "happy"],
  className,
}: {
  size?: number;
  motion?: "bob" | "hop" | "none";
  moods?: [CatMood, CatMood];
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-end ${className ?? ""}`} aria-hidden="true">
      <span className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: -size * 0.18 }}>
        <Heart size={Math.round(size * 0.26)} />
      </span>
      <Cat variant="mochi" size={size} motion={motion} mood={moods[0]} />
      <Cat variant="boba" size={size} motion={motion} mood={moods[1]} delay={0.35} className="-ml-[18%]" />
    </span>
  );
}
