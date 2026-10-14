"use client";

import { useRef, useState } from "react";
import { Cat, Heart, type CatMood, type CatVariant } from "@/components/cat";
import { burstHearts, haptic, play } from "@/lib/feel";

const LINES: Record<CatVariant, string[]> = {
  mochi: ["Miaw! Kangen kamu", "Elus lagi dong", "Kapan ketemu lagi?", "Purr… purr…", "Aku jagain kalian"],
  boba: ["Nyaa~", "Aku sayang kalian", "Jangan lupa makan ya", "Ayo kencan!", "Hehe geli"],
};

/** Mochi & Boba yang bisa dicolek: melompat, mengeong, dan menebar hati. */
export function PetCats({ size = 72, className = "" }: { size?: number; className?: string }) {
  const [active, setActive] = useState<CatVariant | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pet(variant: CatVariant, e: React.PointerEvent) {
    const pick = LINES[variant][Math.floor(Math.random() * LINES[variant].length)];
    setActive(variant);
    setLine(pick);
    play("meow");
    haptic([12, 30, 12]);
    burstHearts(e.clientX, e.clientY, 8);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setActive(null);
      setLine(null);
    }, 1600);
  }

  const mood = (v: CatVariant): CatMood => (active === v ? "love" : "happy");

  return (
    <span className={`relative inline-flex items-end ${className}`}>
      {line ? (
        <span
          key={line}
          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-2xl bg-white px-3 py-1.5 text-xs font-bold whitespace-nowrap text-navy shadow-soft"
          style={{ animation: "pop-in .3s cubic-bezier(.2,.9,.3,1.4) both" }}
        >
          {line}
        </span>
      ) : (
        <span className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: -size * 0.18 }} aria-hidden="true">
          <Heart size={Math.round(size * 0.26)} />
        </span>
      )}
      <button type="button" aria-label="Colek Mochi" onPointerDown={(e) => pet("mochi", e)} className="relative">
        <Cat variant="mochi" size={size} mood={mood("mochi")} motion={active === "mochi" ? "hop" : "bob"} />
      </button>
      <button type="button" aria-label="Colek Boba" onPointerDown={(e) => pet("boba", e)} className="relative -ml-[18%]">
        <Cat variant="boba" size={size} mood={mood("boba")} motion={active === "boba" ? "hop" : "bob"} delay={0.35} />
      </button>
    </span>
  );
}
