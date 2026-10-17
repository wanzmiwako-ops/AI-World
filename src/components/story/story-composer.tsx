"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CameraCapture } from "@/components/camera-capture";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { randomId } from "@/lib/image";
import { attempt, OFFLINE } from "@/lib/offline";
import { haptic, play, rainHearts } from "@/lib/feel";
import { createStory } from "@/app/(app)/story-actions";

const W = 1080;
const H = 1920;

type Item = {
  id: string;
  type: "text" | "sticker" | "word";
  text: string;
  color: string;
  pill: boolean;
  x: number; // 0..1 dari lebar panggung
  y: number; // 0..1 dari tinggi panggung
  scale: number;
  rot: number; // radian
};
type Stroke = { color: string; width: number; pts: [number, number][] };

const COLORS = ["#FFFFFF", "#0B2545", "#FF7A93", "#FFD23F", "#7FDBEA", "#7B62E0", "#2FBF71", "#000000"];
const GRADIENTS: [string, string][] = [
  ["--color-ocean", "--color-aqua"],
  ["#FF9A9E", "#FECFEF"],
  ["#A18CD1", "#FBC2EB"],
  ["#F6D365", "#FDA085"],
  ["#84FAB0", "#8FD3F4"],
  ["#0B2545", "#7B62E0"],
];
const STICKERS = ["😻", "🐱", "🐾", "💗", "💕", "💞", "✨", "🌸", "🌈", "🍓", "🧸", "🎀", "🔥", "😍", "🥰", "😘", "🤍", "💌", "🍰", "🌙", "⭐", "🫶", "👑", "🎉", "😆", "🥺", "☕", "🍜", "🎧", "📸"];
const WORDS = ["Kangen!", "Miss u 💗", "Lagi apa?", "Semangat!", "Punya kamu 🫶", "Hehe 😆", "Bobo dulu 🌙", "Laper 🍜"];

const SOURCES = [
  { key: "camera", label: "Kamera", emoji: "📷" },
  { key: "gallery", label: "Galeri", emoji: "🖼️" },
  { key: "text", label: "Teks", emoji: "Aa" },
] as const;

const BASE: Record<Item["type"], number> = { text: 0.075, sticker: 0.17, word: 0.06 };

function cssVar(v: string) {
  if (!v.startsWith("--")) return v;
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#0A6EBD";
}
function readable(bg: string) {
  const h = bg.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#0B2545" : "#FFFFFF";
}
function displayFont() {
  const probe = document.createElement("span");
  probe.className = "font-display";
  document.body.appendChild(probe);
  const f = getComputedStyle(probe).fontFamily;
  probe.remove();
  return f || "sans-serif";
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (!s.pts.length) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width * w;
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * h);
    for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x * w, y * h);
    ctx.stroke();
  }
}

/** Gambar satu stiker/teks ke kanvas (dipakai saat menyimpan story). */
function drawItem(ctx: CanvasRenderingContext2D, it: Item, font: string) {
  const size = BASE[it.type] * W * it.scale;
  ctx.save();
  ctx.translate(it.x * W, it.y * H);
  ctx.rotate(it.rot);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = it.text.split("\n");
  const lh = size * 1.22;
  ctx.font = `${it.type === "sticker" ? "" : "600 "}${size}px ${it.type === "sticker" ? "sans-serif" : font}`;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const bw = Math.max(...widths);
  const top = -((lines.length - 1) * lh) / 2;
  if (it.type !== "sticker" && it.pill) {
    const padX = size * 0.45;
    const padY = size * 0.28;
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.roundRect(-bw / 2 - padX, top - lh / 2 - padY + size * 0.08, bw + padX * 2, lh * lines.length + padY * 2 - size * 0.16, size * 0.55);
    ctx.fill();
    ctx.fillStyle = readable(it.color);
  } else {
    ctx.fillStyle = it.color;
    if (it.type !== "sticker") {
      ctx.shadowColor = "rgba(0,0,0,.28)";
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.05;
    }
  }
  lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lh));
  ctx.restore();
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

type Step = "pick" | "edit";

export function StoryComposer({ open, onClose, coupleId, partnerName }: { open: boolean; onClose: () => void; coupleId: string; partnerName: string }) {
  const [step, setStep] = useState<Step>("pick");
  const [camOpen, setCamOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [grad, setGrad] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"move" | "draw">("move");
  const [penColor, setPenColor] = useState(COLORS[2]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stageW, setStageW] = useState(360);
  const [stageH, setStageH] = useState(640);
  const boxRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stageRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ id: string; start: Item; p0: Map<number, { x: number; y: number }>; t0: number; moved: boolean } | null>(null);
  const drawing = useRef<Stroke | null>(null);

  const reset = useCallback(() => {
    setStep("pick");
    setPhoto((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setItems([]);
    setStrokes([]);
    setMode("move");
    setEditing(null);
    setStickersOpen(false);
    setError(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Ukuran panggung 9:16 mengikuti layar
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const w = Math.min(el.clientWidth, (el.clientHeight * 9) / 16);
      setStageW(Math.floor(w));
      setStageH(Math.floor((w * 16) / 9));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, open]);

  // Gambar ulang coretan di layar
  useEffect(() => {
    const c = drawRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawStrokes(ctx, strokes, c.width, c.height);
  }, [strokes, step, stageW]);

  function pickSource(key: (typeof SOURCES)[number]["key"]) {
    play("tap");
    if (key === "camera") setCamOpen(true);
    else if (key === "gallery") fileRef.current?.click();
    else setStep("edit");
  }

  function choosePhoto(blob: Blob) {
    setPhoto(URL.createObjectURL(blob));
    setStep("edit");
  }

  function addItem(type: Item["type"], text: string, color = "#FFFFFF", pill = false) {
    const n = items.length;
    const spots = [[0.5, 0.42], [0.3, 0.26], [0.7, 0.66], [0.68, 0.24], [0.32, 0.7], [0.5, 0.82]];
    const [x, y] = type === "text" ? [0.5, 0.5] : spots[n % spots.length];
    const it: Item = { id: randomId(), type, text, color, pill, x, y, scale: 1, rot: (Math.random() - 0.5) * (type === "text" ? 0 : 0.3) };
    setItems((l) => [...l, it]);
    setActiveId(it.id);
    play("pop");
    haptic(10);
  }

  // ----- Gestur: geser (1 jari), cubit & putar (2 jari) -----
  function local(e: { clientX: number; clientY: number }) {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function onDown(e: React.PointerEvent) {
    if (!stageRef.current) return;
    stageRef.current.setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (mode === "draw") {
      if (pointers.current.size > 1) return;
      drawing.current = { color: penColor, width: 0.014, pts: [[p.x, p.y]] };
      setStrokes((s) => [...s, drawing.current!]);
      return;
    }
    const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-item]")?.dataset.item ?? (pointers.current.size > 1 ? gesture.current?.id : null);
    const id = hit ?? null;
    if (!id) {
      setActiveId(null);
      return;
    }
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setActiveId(id);
    gesture.current = { id, start: { ...it }, p0: new Map(pointers.current), t0: gesture.current?.id === id && pointers.current.size > 1 ? gesture.current.t0 : Date.now(), moved: pointers.current.size > 1 };
  }

  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (mode === "draw") {
      const d = drawing.current;
      if (!d) return;
      d.pts.push([p.x, p.y]);
      setStrokes((s) => [...s.slice(0, -1), { ...d }]);
      return;
    }
    const g = gesture.current;
    if (!g) return;
    const ids = [...pointers.current.keys()].filter((k) => g.p0.has(k));
    let next: Partial<Item>;
    if (ids.length >= 2) {
      const [a, b] = ids;
      const a0 = g.p0.get(a)!, b0 = g.p0.get(b)!, a1 = pointers.current.get(a)!, b1 = pointers.current.get(b)!;
      const ar = 9 / 16; // rasio lebar/tinggi supaya jarak & sudut benar
      const dist = (u: { x: number; y: number }, v: { x: number; y: number }) => Math.hypot((u.x - v.x) * ar, u.y - v.y);
      const ang = (u: { x: number; y: number }, v: { x: number; y: number }) => Math.atan2(v.y - u.y, (v.x - u.x) * ar);
      const scale = Math.max(0.3, Math.min(5, (g.start.scale * dist(a1, b1)) / Math.max(0.001, dist(a0, b0))));
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
      next = { scale, rot: g.start.rot + ang(a1, b1) - ang(a0, b0), x: g.start.x + mid1.x - mid0.x, y: g.start.y + mid1.y - mid0.y };
      g.moved = true;
    } else if (ids.length === 1) {
      const p0 = g.p0.get(ids[0])!;
      const dx = p.x - p0.x;
      const dy = p.y - p0.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.01) {
        g.moved = true;
        setDragging(true);
      }
      next = { x: g.start.x + dx, y: g.start.y + dy };
      setOverTrash(p.y > 0.86 && Math.abs(p.x - 0.5) < 0.16);
    } else return;
    setItems((l) => l.map((i) => (i.id === g.id ? { ...i, ...next } : i)));
  }

  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (mode === "draw") {
      drawing.current = null;
      return;
    }
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size === 1) {
      // satu jari tersisa: lanjutkan geser dari posisi sekarang
      const it = items.find((i) => i.id === g.id);
      if (it) gesture.current = { ...g, start: { ...it }, p0: new Map(pointers.current) };
      return;
    }
    if (pointers.current.size > 0) return;
    const it = items.find((i) => i.id === g.id);
    if (overTrash && it) {
      setItems((l) => l.filter((i) => i.id !== g.id));
      haptic([15, 30, 15]);
      play("error");
    } else if (!g.moved && Date.now() - g.t0 < 300 && it && it.type === "text") {
      setEditing(it);
    }
    gesture.current = null;
    setOverTrash(false);
    setDragging(false);
  }

  // ----- Simpan & kirim -----
  async function render(): Promise<{ full: Blob; thumb: Blob } | null> {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    if (photo) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      const img = await loadImage(photo);
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    } else {
      const [a, b] = GRADIENTS[grad];
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, cssVar(a));
      g.addColorStop(1, cssVar(b));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    drawStrokes(ctx, strokes, W, H);
    const font = displayFont();
    await document.fonts?.ready;
    for (const it of items) drawItem(ctx, it, font);
    const full = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.88));
    const t = document.createElement("canvas");
    t.width = 360;
    t.height = 640;
    t.getContext("2d")?.drawImage(c, 0, 0, 360, 640);
    const thumb = await new Promise<Blob | null>((r) => t.toBlob(r, "image/webp", 0.75));
    return full && thumb ? { full, thumb } : null;
  }

  function share() {
    setError(null);
    setActiveId(null);
    startTransition(async () => {
      const out = await render().catch(() => null);
      if (!out) return setError("Story gagal dibuat. Coba lagi, ya.");
      const id = randomId();
      const path = `${coupleId}/stories/${id}.webp`;
      const thumbPath = `${coupleId}/stories/${id}_t.webp`;
      const bucket = createClient().storage.from("gallery");
      const opts = { contentType: "image/webp", cacheControl: "31536000" };
      const up = await Promise.all([bucket.upload(path, out.full, opts), bucket.upload(thumbPath, out.thumb, opts)]).catch(() => null);
      if (!up || up[0].error) return setError(up?.[0].error?.message ?? OFFLINE);
      const res = await attempt(() => createStory({ mediaPath: path, thumbPath: up[1].error ? null : thumbPath }));
      if ("error" in res && res.error) {
        play("error");
        return setError(res.error);
      }
      play("send");
      haptic([20, 40, 20]);
      rainHearts(14);
      close();
    });
  }

  if (!open || typeof document === "undefined") return null;

  const bg = photo ? undefined : `linear-gradient(160deg, ${GRADIENTS[grad][0].startsWith("--") ? `var(${GRADIENTS[grad][0]})` : GRADIENTS[grad][0]}, ${GRADIENTS[grad][1].startsWith("--") ? `var(${GRADIENTS[grad][1]})` : GRADIENTS[grad][1]})`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Bikin story" className="fixed inset-0 z-[75] flex flex-col bg-[#0b1220] text-white" style={{ animation: "fade-in .15s ease both" }}>
      {step === "pick" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6" style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--color-pink) 40%, transparent), transparent 55%), radial-gradient(circle at 80% 80%, color-mix(in oklab, var(--color-ocean) 55%, transparent), transparent 60%)" }}>
          <button type="button" onClick={close} aria-label="Tutup" className="absolute top-0 left-0 m-4 flex size-11 items-center justify-center rounded-full bg-white/15" style={{ marginTop: "max(env(safe-area-inset-top), 16px)" }}>
            <Icon name="close" size={20} />
          </button>
          <span className="text-6xl" style={{ animation: "bob 2.4s ease-in-out infinite" }}>📸</span>
          <div className="text-center">
            <h2 className="font-display text-[28px] font-semibold">Bikin story</h2>
            <p className="text-sm opacity-80">Cuma {partnerName} yang bisa lihat · hilang dalam 24 jam</p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-3 gap-3">
            {SOURCES.map((o, i) => (
              <button
                key={o.label}
                type="button"
                onClick={() => pickSource(o.key)}
                className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[24px] bg-white/12 font-bold ring-1 ring-white/20 active:scale-95"
                style={{ animation: `pop-in .4s ease ${i * 0.07}s both` }}
              >
                <span className="font-display text-[34px] leading-none">{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Pilih foto"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) choosePhoto(f);
            }}
          />
        </div>
      ) : (
        <>
          {/* Panggung 9:16 */}
          <div ref={boxRef} className="relative flex min-h-0 flex-1 items-center justify-center" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <div
              ref={stageRef}
              className="relative shrink-0 touch-none overflow-hidden rounded-[20px] bg-black select-none"
              style={{ background: bg, width: stageW, height: stageH }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover" />
              )}
              <canvas ref={drawRef} width={540} height={960} className="pointer-events-none absolute inset-0 size-full" />
              {items.map((it) => {
                const size = BASE[it.type] * stageW;
                const pill = it.type !== "sticker" && it.pill;
                return (
                  <div
                    key={it.id}
                    data-item={it.id}
                    className={`absolute cursor-grab text-center leading-[1.22] whitespace-pre ${it.type === "sticker" ? "" : "font-display font-semibold"}`}
                    style={{
                      left: `${it.x * 100}%`,
                      top: `${it.y * 100}%`,
                      fontSize: size,
                      color: pill ? readable(it.color) : it.color,
                      background: pill ? it.color : undefined,
                      padding: pill ? `${size * 0.2}px ${size * 0.45}px` : undefined,
                      borderRadius: pill ? size * 0.55 : undefined,
                      textShadow: !pill && it.type !== "sticker" ? `0 ${size * 0.05}px ${size * 0.18}px rgba(0,0,0,.28)` : undefined,
                      transform: `translate(-50%, -50%) rotate(${it.rot}rad) scale(${it.scale * (activeId === it.id && dragging && overTrash ? 0.6 : 1)})`,
                      outline: activeId === it.id && mode === "move" && !dragging ? "2px dashed rgba(255,255,255,.7)" : undefined,
                      outlineOffset: 6,
                      opacity: activeId === it.id && overTrash ? 0.6 : 1,
                      transition: "outline-color .2s",
                    }}
                  >
                    {it.text}
                  </div>
                );
              })}
              {dragging && (
                <span
                  className={`pointer-events-none absolute bottom-6 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full ${overTrash ? "scale-125 bg-pink" : "bg-black/45"} transition-transform`}
                >
                  <Icon name="trash" size={24} />
                </span>
              )}
              {!items.length && !photo && !strokes.length && (
                <button
                  type="button"
                  onClick={() => setEditing({ id: "", type: "text", text: "", color: "#FFFFFF", pill: false, x: 0.5, y: 0.5, scale: 1, rot: 0 })}
                  className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold opacity-80"
                >
                  Ketuk untuk menulis ✍️
                </button>
              )}
            </div>

            {/* Alat di atas */}
            {!editing && (
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
                <button type="button" onClick={close} aria-label="Batal" className="flex size-11 items-center justify-center rounded-full bg-black/40">
                  <Icon name="close" size={20} />
                </button>
                {mode === "draw" ? (
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Urungkan" onClick={() => setStrokes((s) => s.slice(0, -1))} className="flex size-11 items-center justify-center rounded-full bg-black/40">
                      <Icon name="undo" size={20} />
                    </button>
                    <button type="button" onClick={() => setMode("move")} className="h-11 rounded-full bg-white px-4 font-bold text-navy">
                      Selesai
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {[
                      { label: "Tulis teks", icon: "text" as const, on: () => setEditing({ id: "", type: "text", text: "", color: "#FFFFFF", pill: false, x: 0.5, y: 0.5, scale: 1, rot: 0 }) },
                      { label: "Stiker", icon: "smile" as const, on: () => setStickersOpen(true) },
                      { label: "Coret", icon: "brush" as const, on: () => setMode("draw") },
                    ].map((t) => (
                      <button key={t.label} type="button" aria-label={t.label} onClick={t.on} className="flex size-11 items-center justify-center rounded-full bg-black/40">
                        <Icon name={t.icon} size={21} />
                      </button>
                    ))}
                    {!photo && (
                      <button
                        type="button"
                        aria-label="Ganti warna latar"
                        onClick={() => setGrad((g) => (g + 1) % GRADIENTS.length)}
                        className="size-11 rounded-full ring-2 ring-white"
                        style={{ background: bg }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
            {mode === "draw" && !editing && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Warna ${c}`}
                    onClick={() => setPenColor(c)}
                    className="size-8 rounded-full ring-2 ring-white/80 transition-transform"
                    style={{ background: c, transform: penColor === c ? "scale(1.3)" : undefined }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bawah: kirim */}
          {mode === "move" && !editing && (
            <div className="flex items-center justify-between gap-3 px-4 pt-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}>
              {error ? <p className="min-w-0 flex-1 text-sm font-semibold text-pink">{error}</p> : <span className="text-sm opacity-75">Cubit untuk besarkan & putar 🤏</span>}
              <button
                type="button"
                disabled={pending}
                onClick={share}
                className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-white pr-2 pl-5 font-bold text-navy disabled:opacity-70"
              >
                {pending ? "Mengirim…" : `Kirim ke ${partnerName}`}
                <span className="flex size-8 items-center justify-center rounded-full bg-pink text-white">
                  <Icon name="next" size={18} />
                </span>
              </button>
            </div>
          )}

          {/* Penulis teks */}
          {editing && (
            <TextEditor
              initial={editing}
              onCancel={() => setEditing(null)}
              onDone={(it) => {
                setEditing(null);
                if (!it.text.trim()) {
                  if (it.id) setItems((l) => l.filter((i) => i.id !== it.id));
                  return;
                }
                if (it.id) setItems((l) => l.map((i) => (i.id === it.id ? it : i)));
                else addItem("text", it.text, it.color, it.pill);
              }}
            />
          )}

          {/* Pilih stiker */}
          {stickersOpen && (
            <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50" onClick={() => setStickersOpen(false)}>
              <div
                className="flex max-h-[60%] flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-[#16213a] p-5"
                style={{ animation: "sheet-up .3s cubic-bezier(.2,.9,.3,1) both", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="mx-auto h-1.5 w-12 rounded-full bg-white/25" />
                <div className="flex flex-wrap gap-2">
                  {WORDS.map((w, i) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        addItem("word", w, COLORS[[2, 3, 4, 5, 0][i % 5]], true);
                        setStickersOpen(false);
                      }}
                      className="rounded-full px-3.5 py-1.5 font-display text-sm font-semibold"
                      style={{ background: COLORS[[2, 3, 4, 5, 0][i % 5]], color: readable(COLORS[[2, 3, 4, 5, 0][i % 5]]) }}
                    >
                      {w}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
                      addItem("word", `🕐 ${t}`, "#FFFFFF", true);
                      setStickersOpen(false);
                    }}
                    className="rounded-full bg-white px-3.5 py-1.5 font-display text-sm font-semibold text-navy"
                  >
                    🕐 Jam sekarang
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        addItem("sticker", s);
                        setStickersOpen(false);
                      }}
                      className="flex aspect-square items-center justify-center rounded-2xl text-[32px] active:scale-90 active:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <CameraCapture open={camOpen} onClose={() => setCamOpen(false)} onPick={choosePhoto} confirmLabel="Lanjut" />
    </div>,
    document.body,
  );
}

function TextEditor({ initial, onDone, onCancel }: { initial: Item; onDone: (it: Item) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial.text);
  const [color, setColor] = useState(initial.color);
  const [pill, setPill] = useState(initial.pill);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const done = () => onDone({ ...initial, text: text.slice(0, 160), color, pill });
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black/65" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
      <div className="flex items-center justify-between p-3">
        <button type="button" onClick={onCancel} className="h-10 rounded-full px-3 font-bold">
          Batal
        </button>
        <button
          type="button"
          onClick={() => setPill((p) => !p)}
          aria-label="Gaya teks"
          className={`flex h-10 items-center rounded-full px-3 font-display font-bold ${pill ? "bg-white text-navy" : "ring-2 ring-white"}`}
        >
          A
        </button>
        <button type="button" onClick={done} className="h-10 rounded-full bg-white px-4 font-bold text-navy">
          Selesai
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6" onClick={done}>
        <textarea
          ref={ref}
          value={text}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setText(e.target.value)}
          maxLength={160}
          rows={Math.min(5, Math.max(1, text.split("\n").length))}
          placeholder="Tulis sesuatu…"
          aria-label="Teks story"
          className="w-full resize-none bg-transparent text-center font-display text-[30px] leading-tight font-semibold outline-none placeholder:text-white/50"
          style={pill ? { color: readable(color), background: color, borderRadius: 22, padding: "8px 14px" } : { color, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}
        />
      </div>
      <div className="flex justify-center gap-2 p-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Warna ${c}`}
            onClick={() => setColor(c)}
            className="size-8 rounded-full ring-2 ring-white/80 transition-transform"
            style={{ background: c, transform: color === c ? "scale(1.3)" : undefined }}
          />
        ))}
      </div>
    </div>
  );
}
