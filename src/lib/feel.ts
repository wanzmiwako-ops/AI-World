"use client";

/**
 * Efek kecil yang bikin aplikasi terasa hidup:
 * suara (disintesis langsung, tanpa file), getar, dan ledakan hati.
 */

const SOUND_KEY = "aiw-sound";
const HAPTIC_KEY = "aiw-haptic";

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

export function isSoundOn() {
  return readFlag(SOUND_KEY);
}
export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {}
}
export function isHapticOn() {
  return readFlag(HAPTIC_KEY);
}
export function setHapticOn(on: boolean) {
  try {
    localStorage.setItem(HAPTIC_KEY, on ? "on" : "off");
  } catch {}
}

let ctx: AudioContext | null = null;

/** Browser HP baru mengizinkan suara setelah layar disentuh sekali. */
export function primeAudio() {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

function tone(
  freq: number,
  { at = 0, dur = 0.12, type = "sine", gain = 0.18, to }: { at?: number; dur?: number; type?: OscillatorType; gain?: number; to?: number } = {},
) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = "tap" | "pop" | "send" | "ding" | "meow" | "chime" | "error" | "unlock";

export function play(name: Sfx) {
  if (typeof window === "undefined" || !isSoundOn()) return;
  primeAudio();
  if (!ctx) return;
  switch (name) {
    case "tap":
      tone(880, { dur: 0.05, gain: 0.06, type: "triangle" });
      break;
    case "pop":
      tone(520, { dur: 0.09, to: 980, gain: 0.16, type: "triangle" });
      break;
    case "send":
      tone(660, { dur: 0.08, to: 1320, gain: 0.12, type: "sine" });
      break;
    case "ding":
      tone(1046, { dur: 0.16, gain: 0.12 });
      tone(1568, { at: 0.09, dur: 0.22, gain: 0.1 });
      break;
    case "meow":
      // "miaw" kecil: nada naik lalu turun dengan getaran halus
      tone(620, { dur: 0.14, to: 1080, gain: 0.12, type: "triangle" });
      tone(1080, { at: 0.13, dur: 0.24, to: 520, gain: 0.11, type: "triangle" });
      break;
    case "chime":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.3, gain: 0.1 }));
      break;
    case "unlock":
      tone(784, { dur: 0.09, gain: 0.1 });
      tone(1175, { at: 0.08, dur: 0.18, gain: 0.1 });
      break;
    case "error":
      tone(220, { dur: 0.12, gain: 0.12, type: "square" });
      tone(180, { at: 0.11, dur: 0.16, gain: 0.1, type: "square" });
      break;
  }
}

export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined" || !isHapticOn()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

const HEART =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9C.8 8.6 2.8 4.5 6.6 4.5c2.1 0 3.6 1.3 5.4 3 1.8-1.7 3.3-3 5.4-3 3.8 0 5.8 4.1 4.2 7.5C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';
const COLORS = ["#FF7A93", "#FF9FB2", "#7FDBEA", "#0A6EBD", "#F5B83D"];

function heartLayer() {
  let layer = document.getElementById("heart-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "heart-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:90;overflow:hidden";
    document.body.appendChild(layer);
  }
  return layer;
}

function spawnHeart(x: number, y: number, color: string, dx: number, dy: number, dur: number, size = 14 + Math.random() * 16) {
  const el = document.createElement("span");
  const rot = (Math.random() - 0.5) * 70;
  el.innerHTML = HEART;
  el.style.cssText = `position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;color:${color};--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;animation:heart-fly ${dur}s cubic-bezier(.2,.7,.3,1) forwards`;
  heartLayer().appendChild(el);
  setTimeout(() => el.remove(), dur * 1000 + 200);
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Hati-hati kecil beterbangan ke atas dari titik (x, y) di layar. */
export function burstHearts(x: number, y: number, count = 10) {
  if (typeof document === "undefined" || reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    spawnHeart(x, y, COLORS[i % COLORS.length], (Math.random() - 0.5) * 180, -(90 + Math.random() * 140), 0.8 + Math.random() * 0.5);
  }
}

/** Hujan hati yang jatuh dari atas layar (untuk momen spesial). */
export function rainHearts(count = 24) {
  if (typeof document === "undefined" || reducedMotion()) return;
  const h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      spawnHeart(
        Math.random() * window.innerWidth,
        -20,
        COLORS[i % COLORS.length],
        (Math.random() - 0.5) * 120,
        h * (0.55 + Math.random() * 0.45),
        1.6 + Math.random() * 1.2,
        16 + Math.random() * 18,
      );
    }, i * 70);
  }
}

/** Titik tengah sebuah elemen (untuk asal ledakan hati). */
export function centerOf(el: Element | null) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
