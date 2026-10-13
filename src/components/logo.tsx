/** Logo A&I WORLD: dua kepala kucing yang berdampingan, hati di tengahnya. */
export function LogoMark({ size = 44, onDark = false }: { size?: number; onDark?: boolean }) {
  const outline = onDark ? "#FFFFFF" : "#0B2545";
  const mochi = onDark ? "#FFFFFF" : "#9CC9F0";
  const boba = "#FFE1A8";
  return (
    <svg width={size} height={(size * 48) / 64} viewBox="0 0 64 48" aria-hidden="true">
      {/* Mochi */}
      <path d="M5 22 L6 5 L19 14 Z" fill={mochi} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 22 L30 5 L17 14 Z" fill={mochi} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="18" cy="29" rx="15" ry="13" fill={mochi} stroke={outline} strokeWidth="2" />
      <circle cx="13" cy="28" r="1.9" fill="#0B2545" />
      <circle cx="23" cy="28" r="1.9" fill="#0B2545" />
      <path d="M16.5 32 L19.5 32 L18 33.8 Z" fill="#FF8FA6" />
      {/* Boba */}
      <path d="M33 22 L34 5 L47 14 Z" fill={boba} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      <path d="M59 22 L58 5 L45 14 Z" fill={boba} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="46" cy="29" rx="15" ry="13" fill={boba} stroke={outline} strokeWidth="2" />
      <path d="M43 18 L43 22 M46 17.5 L46 21.5 M49 18 L49 22" stroke="#F5B048" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="41" cy="28" r="1.9" fill="#0B2545" />
      <circle cx="51" cy="28" r="1.9" fill="#0B2545" />
      <path d="M44.5 32 L47.5 32 L46 33.8 Z" fill="#FF8FA6" />
      {/* hati */}
      <path
        d="M32 46 C 26 42 25.5 37 28.6 37 C 30 37 32 38.6 32 38.6 C 32 38.6 34 37 35.4 37 C 38.5 37 38 42 32 46 Z"
        fill="#FF7A93"
        stroke={onDark ? "#FFFFFF" : "none"}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Wordmark({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return (
    <span className={`font-display leading-none font-semibold ${className}`}>
      <span className={onDark ? "text-white" : "text-navy"}>
        A<span className="text-pink">&amp;</span>I
      </span>{" "}
      <span className={`tracking-[0.16em] ${onDark ? "text-aqua" : "text-ocean"}`}>WORLD</span>
    </span>
  );
}

export function Logo({
  onDark = false,
  size = 40,
  textClass = "text-2xl",
}: {
  onDark?: boolean;
  size?: number;
  textClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} onDark={onDark} />
      <Wordmark onDark={onDark} className={textClass} />
    </span>
  );
}
