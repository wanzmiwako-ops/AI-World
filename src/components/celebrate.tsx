"use client";

import { useEffect } from "react";
import { burstHearts, haptic, play, rainHearts } from "@/lib/feel";

/** Hujan hati sekali per hari di hari spesial (hari ke-100, 200, …, atau anniversary). */
export function Celebrate({ id }: { id: string }) {
  useEffect(() => {
    const key = `aiw-celebrated-${id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    const t = setTimeout(() => {
      rainHearts(36);
      play("chime");
    }, 600);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}

/** Hati yang meledak saat diketuk. */
export function TapHeart({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Ketuk hati"
      className={`tap ${className}`}
      onPointerDown={(e) => {
        burstHearts(e.clientX, e.clientY, 12);
        haptic(15);
        play("pop");
      }}
    >
      {children}
    </button>
  );
}
