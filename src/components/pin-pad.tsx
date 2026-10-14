"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { haptic, play } from "@/lib/feel";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/**
 * Papan angka PIN 4 digit. Memanggil onComplete saat 4 angka terisi.
 * `shakeKey` berubah → titik-titik bergoyang (PIN salah).
 */
export function PinPad({
  onComplete,
  disabled = false,
  shakeKey = 0,
  onDigit,
  dark = false,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  shakeKey?: number;
  onDigit?: (length: number) => void;
  dark?: boolean;
}) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (shakeKey) {
      haptic([40, 40, 40]);
      play("error");
      const t = setTimeout(() => setPin(""), 380);
      return () => clearTimeout(t);
    }
  }, [shakeKey]);

  function press(key: string) {
    if (disabled) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      onDigit?.(Math.max(0, pin.length - 1));
      haptic(6);
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    onDigit?.(next.length);
    haptic(8);
    play("tap");
    if (next.length === 4) setTimeout(() => onComplete(next), 120);
  }

  // Keyboard fisik (PC)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keyBase = dark
    ? "bg-white/12 text-white active:bg-white/25"
    : "bg-white text-navy shadow-soft active:bg-tint";

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      <div
        key={shakeKey}
        className="flex gap-4"
        role="status"
        aria-label={`${pin.length} dari 4 angka`}
        style={shakeKey ? { animation: "shake .38s ease" } : undefined}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`size-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? dark
                  ? "scale-110 border-white bg-white"
                  : "scale-110 border-ocean bg-ocean"
                : dark
                  ? "border-white/60"
                  : "border-[#9DB3C6]"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(k)}
              aria-label={k === "del" ? "Hapus angka" : k}
              className={`flex size-[72px] items-center justify-center rounded-full font-display text-[28px] font-medium transition-transform active:scale-90 disabled:opacity-50 ${
                k === "del" ? (dark ? "text-white" : "text-navy") : keyBase
              }`}
            >
              {k === "del" ? <Icon name="back" size={26} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
