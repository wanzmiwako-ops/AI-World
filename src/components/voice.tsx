"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { haptic, play } from "@/lib/feel";

export const MAX_VOICE_MS = 120_000;

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export type VoiceClip = { blob: Blob; durationMs: number; mime: string; ext: string };

/**
 * Tombol mikrofon ala WhatsApp:
 * - tahan untuk merekam, lepas untuk kirim
 * - geser ke kiri untuk batal
 * - geser ke atas untuk mengunci (lalu bisa lepas jari, tekan kirim saat selesai)
 */
export function VoiceButton({
  onRecorded,
  onState,
  onError,
}: {
  onRecorded: (clip: VoiceClip) => void;
  onState: (s: { recording: boolean; locked: boolean; ms: number; cancelHint: number }) => void;
  onError: (msg: string) => void;
}) {
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const holding = useRef(false);
  const cancelled = useRef(false);
  const [locked, setLocked] = useState(false);
  const [recording, setRecording] = useState(false);
  const lockedRef = useRef(false);
  const stateRef = useRef({ recording: false, locked: false, ms: 0, cancelHint: 0 });

  const emit = (patch: Partial<typeof stateRef.current>) => {
    stateRef.current = { ...stateRef.current, ...patch };
    onState(stateRef.current);
  };

  function cleanup() {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
    lockedRef.current = false;
    setLocked(false);
    setRecording(false);
    emit({ recording: false, locked: false, ms: 0, cancelHint: 0 });
  }

  useEffect(
    () => () => {
      cancelled.current = true;
      try {
        rec.current?.stop();
      } catch {}
      stream.current?.getTracks().forEach((t) => t.stop());
      if (tick.current) clearInterval(tick.current);
    },
    [],
  );

  async function start() {
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      onError("Perangkat ini belum mendukung voice note.");
      return;
    }
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = (e as DOMException)?.name;
      onError(name === "NotAllowedError" ? "Izin mikrofon belum diberikan. Aktifkan di pengaturan HP, ya." : "Mikrofon tidak bisa dipakai.");
      return;
    }
    // Jari sudah dilepas saat izin muncul → jangan langsung merekam
    if (!holding.current && !lockedRef.current) {
      s.getTracks().forEach((t) => t.stop());
      onError("Mikrofon siap! Tahan tombolnya untuk merekam 🎤");
      return;
    }
    stream.current = s;
    chunks.current = [];
    cancelled.current = false;
    const r = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    rec.current = r;
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const durationMs = Date.now() - started.current;
      const type = (r.mimeType || mime || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type });
      const wasCancelled = cancelled.current;
      cleanup();
      if (wasCancelled) return;
      if (durationMs < 700 || blob.size < 600) {
        onError("Kependekan. Tahan tombol mikrofon lebih lama, ya.");
        return;
      }
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      onRecorded({ blob, durationMs: Math.min(durationMs, MAX_VOICE_MS), mime: type, ext });
    };
    r.start(250);
    started.current = Date.now();
    setRecording(true);
    haptic(25);
    play("tap");
    emit({ recording: true, ms: 0 });
    tick.current = setInterval(() => {
      const ms = Date.now() - started.current;
      emit({ ms });
      if (ms >= MAX_VOICE_MS) finish(false);
    }, 200);
  }

  function finish(cancel: boolean) {
    cancelled.current = cancel;
    holding.current = false;
    const r = rec.current;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch {
        cleanup();
      }
    } else cleanup();
    if (cancel) {
      haptic([10, 30, 10]);
      play("error");
    }
  }

  if (locked) {
    return (
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Batalkan rekaman" onClick={() => finish(true)} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pink-soft text-[#9b1c3a]">
          <Icon name="trash" size={20} />
        </button>
        <button type="button" aria-label="Kirim voice note" onClick={() => finish(false)} className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-ocean text-white shadow-ocean">
          <Icon name="send" size={20} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Tahan untuk merekam voice note"
      className={`relative flex size-[46px] shrink-0 touch-none items-center justify-center rounded-full text-white shadow-ocean select-none ${recording ? "bg-pink" : "bg-ocean"}`}
      style={recording ? { transform: "scale(1.35)", transition: "transform .15s" } : { transition: "transform .15s" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        origin.current = { x: e.clientX, y: e.clientY };
        holding.current = true;
        void start();
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || !rec.current) return;
        const dx = o.x - e.clientX;
        const dy = o.y - e.clientY;
        emit({ cancelHint: Math.max(0, Math.min(1, dx / 110)) });
        if (dx > 110) {
          origin.current = null;
          finish(true);
        } else if (dy > 70 && !lockedRef.current) {
          lockedRef.current = true;
          holding.current = false;
          origin.current = null;
          setLocked(true);
          haptic(20);
          emit({ locked: true, cancelHint: 0 });
        }
      }}
      onPointerUp={() => {
        const wasHolding = holding.current;
        holding.current = false;
        origin.current = null;
        if (lockedRef.current) return;
        if (rec.current) finish(false);
        else if (wasHolding) emit({ cancelHint: 0 });
      }}
      onPointerCancel={() => {
        holding.current = false;
        origin.current = null;
        if (!lockedRef.current && rec.current) finish(true);
      }}
    >
      {recording && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-pink" style={{ animation: "pulse-ring 1.2s ease-out infinite" }} />}
      <span className="relative">
        <Icon name="mic" size={21} />
      </span>
    </button>
  );
}

/** Bar perekaman yang menggantikan kolom ketik selama merekam. */
export function RecordingBar({ ms, locked, cancelHint }: { ms: number; locked: boolean; cancelHint: number }) {
  return (
    <div className="flex h-[46px] min-w-0 flex-1 items-center gap-3 rounded-full bg-pink-soft px-4 text-[#9b1c3a]">
      <span className="size-2.5 shrink-0 rounded-full bg-pink" style={{ animation: "blink 1s steps(2) infinite" }} />
      <span className="font-bold tabular-nums">{fmt(ms)}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1 truncate text-[13px] font-semibold" style={{ opacity: 1 - cancelHint * 0.7 }}>
        {locked ? (
          "Terkunci 🔒 tekan kirim kalau sudah"
        ) : (
          <>
            <span style={{ transform: `translateX(${-cancelHint * 30}px)` }}>‹ geser batal · ↑ kunci</span>
          </>
        )}
      </span>
    </div>
  );
}

function bars(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) | 0;
    const r = ((h >>> 16) & 0xff) / 255;
    const env = Math.sin((Math.PI * (i + 0.5)) / n) * 0.5 + 0.5;
    return 0.22 + r * 0.55 * env + 0.18 * env;
  });
}

const PLAY_EVENT = "aiworld:voice-play";

/** Gelembung voice note: putar/jeda, gelombang suara, sisa waktu, dan kecepatan 1×/1.5×/2×. */
export function VoiceBubble({ id, src, durationMs, mine }: { id: string; src?: string; durationMs: number | null | undefined; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState(1);
  const total = durationMs && durationMs > 0 ? durationMs : 0;
  const wave = bars(id, 28);
  const progress = total ? Math.min(1, pos / total) : 0;

  // Hanya satu voice note yang berbunyi dalam satu waktu
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [id]);

  function toggle() {
    const a = audio.current;
    if (!a || !src) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
      a.playbackRate = speed;
      void a.play().catch(() => {});
    } else a.pause();
  }

  const fg = mine ? "bg-white" : "bg-ocean";
  const bg = mine ? "bg-white/35" : "bg-ocean/25";

  return (
    <div className={`flex w-[236px] max-w-[70vw] items-center gap-2.5 py-0.5`}>
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Jeda" : "Putar voice note"}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${mine ? "bg-white text-ocean" : "bg-ocean text-white"} disabled:opacity-50`}
      >
        <Icon name={playing ? "pause" : "play"} size={18} strokeWidth={playing ? 3 : 2.4} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className="flex h-7 items-center gap-[2px]"
          onClick={(e) => {
            const a = audio.current;
            if (!a || !total) return;
            const r = e.currentTarget.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            try {
              a.currentTime = (p * total) / 1000;
              setPos(p * total);
            } catch {}
          }}
        >
          {wave.map((h, i) => (
            <span
              key={i}
              className={`w-[3px] flex-1 rounded-full transition-colors ${i / wave.length < progress ? fg : bg}`}
              style={{ height: `${Math.round(h * 100)}%`, animation: playing && i / wave.length >= progress && i / wave.length < progress + 0.08 ? "bob .6s ease-in-out infinite" : undefined }}
            />
          ))}
        </div>
        <div className={`flex items-center justify-between text-[11px] font-semibold ${mine ? "text-white/85" : "text-muted"}`}>
          <span className="tabular-nums">{fmt(playing || pos ? pos : total)}</span>
          <button
            type="button"
            onClick={() => {
              const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
              setSpeed(next);
              if (audio.current) audio.current.playbackRate = next;
            }}
            className={`rounded-full px-1.5 ${mine ? "bg-white/20" : "bg-tint"}`}
          >
            {speed}×
          </button>
        </div>
      </div>
      <span aria-hidden="true" className="text-xl">🎤</span>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setPos(0);
          }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime * 1000)}
        />
      )}
    </div>
  );
}
