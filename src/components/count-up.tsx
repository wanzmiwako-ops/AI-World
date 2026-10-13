"use client";

import { useEffect, useState } from "react";

/** Angka yang menghitung naik saat muncul (mati otomatis kalau pengguna minta gerakan dikurangi). */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [n, setN] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value <= 0) return;
    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{n}</span>;
}
