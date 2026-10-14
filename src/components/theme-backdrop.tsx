import type { CSSProperties } from "react";

/* Posisi tetap (bukan acak) supaya server & browser sama persis. */
const ITEMS = [
  { l: "4%", t: "12%", s: 28, d: 7, delay: 0 },
  { l: "14%", t: "64%", s: 22, d: 9, delay: 1.2 },
  { l: "24%", t: "30%", s: 18, d: 8, delay: 2.4 },
  { l: "33%", t: "86%", s: 26, d: 10, delay: 0.6 },
  { l: "41%", t: "8%", s: 20, d: 7.5, delay: 3.1 },
  { l: "52%", t: "52%", s: 16, d: 9, delay: 1.8 },
  { l: "60%", t: "92%", s: 24, d: 8.5, delay: 2.2 },
  { l: "68%", t: "18%", s: 30, d: 11, delay: 0.3 },
  { l: "76%", t: "70%", s: 20, d: 7, delay: 2.9 },
  { l: "84%", t: "38%", s: 26, d: 9.5, delay: 1.1 },
  { l: "92%", t: "82%", s: 18, d: 8, delay: 3.6 },
  { l: "96%", t: "10%", s: 22, d: 10, delay: 2 },
];

/** Latar belakang bertema: gumpalan warna lembut + hiasan khas tema yang melayang pelan. */
export function ThemeBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Gradasi lembut (tanpa filter blur: blur besar membuat HP berat & layar bisa "kepotong") */}
      <span
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(520px circle at 0% 0%, color-mix(in oklab, var(--color-tint) 85%, transparent), transparent 70%)",
            "radial-gradient(560px circle at 100% 45%, color-mix(in oklab, var(--color-aqua-soft) 75%, transparent), transparent 70%)",
            "radial-gradient(520px circle at 30% 100%, color-mix(in oklab, var(--color-pink-soft) 65%, transparent), transparent 70%)",
            "radial-gradient(360px circle at 100% 100%, color-mix(in oklab, var(--color-sand-soft) 75%, transparent), transparent 70%)",
          ].join(","),
        }}
      />
      {/* Hiasan melayang hanya di layar besar */}
      <div className="absolute inset-0 hidden opacity-45 lg:block">
        {ITEMS.map((it, i) => (
          <span
            key={i}
            className="backdrop-deco absolute leading-none"
            style={
              {
                left: it.l,
                top: it.t,
                fontSize: it.s,
                "--s": `${it.s}px`,
                animation: `bob ${it.d}s ease-in-out ${it.delay}s infinite`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
