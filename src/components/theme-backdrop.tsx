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
      <span className="absolute -top-40 -left-32 size-[520px] rounded-full bg-tint opacity-80 blur-3xl" />
      <span className="absolute top-1/3 -right-40 size-[560px] rounded-full bg-aqua-soft opacity-70 blur-3xl" />
      <span className="absolute -bottom-48 left-1/4 size-[520px] rounded-full bg-pink-soft opacity-60 blur-3xl" />
      <span className="absolute -bottom-32 -right-24 size-[360px] rounded-full bg-sand-soft opacity-70 blur-3xl" />
      <div className="absolute inset-0 opacity-30 lg:opacity-45">
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
