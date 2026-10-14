"use client";

import { useEffect, useId, useRef, useState } from "react";
import { burstHearts, haptic, play, rainHearts } from "@/lib/feel";

const HEART =
  "M100 172 C 42 128, 4 98, 4 56 C 4 26, 26 6, 54 6 C 74 6, 90 18, 100 34 C 110 18, 126 6, 146 6 C 174 6, 196 26, 196 56 C 196 98, 158 128, 100 172 Z";

/** Tingkatan Love Meter dengan emoji. */
export function loveTier(score: number) {
  if (score >= 85) return { emoji: "🔥", label: "Lengket banget!" };
  if (score >= 70) return { emoji: "💗", label: "Hangat & manis" };
  if (score >= 55) return { emoji: "🌤️", label: "Hangat-hangat kuku" };
  if (score >= 40) return { emoji: "🥺", label: "Butuh perhatian" };
  return { emoji: "🧊", label: "Butuh pelukan" };
}

/**
 * Hati berisi "cairan cinta" yang naik sesuai skor, dengan ombak bergerak.
 * Interaktif: diketuk → berdetak & hati beterbangan; 5× ketuk → hujan hati + meong.
 */
export function LoveHeart({ score, size = 220, interactive = true, showNumber = true }: { score: number; size?: number; interactive?: boolean; showNumber?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [level, setLevel] = useState(0);
  const [shown, setShown] = useState(0);
  const [beat, setBeat] = useState(0);
  const taps = useRef(0);

  // Isi naik & angka menghitung naik saat tampil
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(() => {
        setLevel(score);
        setShown(score);
      }, 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / 1600);
      const e = 1 - Math.pow(1 - p, 3);
      setLevel(score * e);
      setShown(Math.round(score * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // Permukaan cairan: 172 (kosong) → 6 (penuh)
  const surface = 172 - (166 * level) / 100;
  const wave = (offset: number, amp: number) =>
    `M ${-200 + offset} ${surface} q 25 ${-amp} 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 V 200 H ${-200 + offset} Z`;

  const content = (
    <svg viewBox="0 0 200 180" width={size} height={(size * 180) / 200} role="img" aria-label={`Love Meter ${score} dari 100`} className="overflow-visible">
      <defs>
        <clipPath id={`clip-${id}`}>
          <path d={HEART} />
        </clipPath>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-blush)" />
          <stop offset="100%" stopColor="var(--color-pink)" />
        </linearGradient>
      </defs>
      <path d={HEART} fill="var(--color-pink-soft)" />
      <g clipPath={`url(#clip-${id})`}>
        <g>
          <path d={wave(0, 9)} fill="var(--color-blush)" opacity="0.55" />
          <animateTransform attributeName="transform" type="translate" from="0 0" to="100 0" dur="2.6s" repeatCount="indefinite" />
        </g>
        <g>
          <path d={wave(25, 7)} fill={`url(#fill-${id})`} />
          <animateTransform attributeName="transform" type="translate" from="100 0" to="0 0" dur="3.4s" repeatCount="indefinite" />
        </g>
        {/* gelembung kecil di dalam cairan */}
        {[40, 92, 140].map((x, i) => (
          <circle key={x} cx={x} cy={170} r={3 + i} fill="white" opacity="0.5">
            <animate attributeName="cy" from="172" to={Math.max(surface + 6, 20)} dur={`${2.4 + i * 0.7}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.6;0" dur={`${2.4 + i * 0.7}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* kilau */}
        <ellipse cx="58" cy="44" rx="20" ry="11" fill="white" opacity="0.35" transform="rotate(-28 58 44)" />
      </g>
      <path d={HEART} fill="none" stroke="var(--color-pink)" strokeWidth="5" strokeLinejoin="round" />
      {showNumber && (
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-display)"
          fontWeight="600"
          fontSize="58"
          fill="var(--color-navy)"
          stroke="white"
          strokeWidth="7"
          paintOrder="stroke"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </text>
      )}
    </svg>
  );

  if (!interactive) return content;
  return (
    <button
      type="button"
      aria-label="Ketuk hatinya"
      className="relative touch-manipulation select-none"
      onPointerDown={(e) => {
        setBeat((b) => b + 1);
        taps.current += 1;
        burstHearts(e.clientX, e.clientY, 10);
        haptic(14);
        if (taps.current % 5 === 0) {
          play("meow");
          rainHearts(20);
          haptic([30, 40, 30, 40, 60]);
        } else play("pop");
      }}
    >
      <span key={beat} className="block" style={beat ? { animation: "beat .7s ease-out" } : { animation: "beat 2.4s ease-in-out infinite" }}>
        {content}
      </span>
    </button>
  );
}
