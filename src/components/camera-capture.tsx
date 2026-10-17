"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { haptic, play } from "@/lib/feel";

type Facing = "user" | "environment";

/**
 * Kamera langsung di dalam aplikasi (untuk pap di chat & story).
 * Bisa ganti kamera depan/belakang, jepret, cek hasil, lalu kirim. Tombol Galeri tetap ada.
 * Kalau kamera tidak bisa dibuka (izin ditolak / tidak ada kamera), otomatis menawarkan galeri.
 */
export function CameraCapture({
  open,
  onClose,
  onPick,
  confirmLabel = "Kirim",
  initialFacing = "user",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (file: Blob) => void;
  confirmLabel?: string;
  initialFacing?: Facing;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>(initialFacing);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Nyalakan kamera saat dibuka / ganti arah; matikan saat ditutup atau sedang melihat hasil jepretan
  useEffect(() => {
    if (!open || shot) return;
    let alive = true;
    (async () => {
      setReady(false);
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera tidak tersedia di perangkat ini. Pilih dari galeri, ya.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        stop();
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Izin kamera belum diberikan. Aktifkan di pengaturan HP, atau pilih dari galeri."
            : "Kamera tidak bisa dibuka. Coba lagi, atau pilih dari galeri.",
        );
      }
    })();
    return () => {
      alive = false;
      stop();
    };
  }, [open, facing, shot, stop]);

  const close = useCallback(() => {
    stop();
    setShot((s) => {
      if (s) URL.revokeObjectURL(s.url);
      return null;
    });
    onClose();
  }, [onClose, stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Kamera depan: hasilnya dicerminkan seperti yang terlihat di layar
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setFlash((f) => f + 1);
    play("tap");
    haptic(18);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        setShot({ blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.92,
    );
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  }

  function confirm(blob: Blob) {
    onPick(blob);
    close();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kamera"
      className="fixed inset-0 z-[90] flex flex-col bg-black text-white"
      style={{ animation: "fade-in .15s ease both" }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="Hasil jepretan" className="absolute inset-0 size-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 size-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined, opacity: ready ? 1 : 0, transition: "opacity .25s" }}
          />
        )}
        {!shot && !ready && !error && (
          <span className="absolute inset-0 flex items-center justify-center text-sm opacity-80">Membuka kamera…</span>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-5xl">📷</span>
            <p className="text-[15px]">{error}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-white px-5 py-2.5 font-bold text-navy">
              Pilih dari galeri
            </button>
          </div>
        )}
        {flash > 0 && <span key={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "fade-in .35s ease reverse both" }} />}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4" style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
          <button type="button" onClick={close} aria-label="Tutup kamera" className="flex size-11 items-center justify-center rounded-full bg-black/40">
            <Icon name="close" size={20} />
          </button>
          {shot && <span className="rounded-full bg-black/40 px-3 py-1.5 text-sm font-bold">Cakep! 😻</span>}
        </div>
      </div>

      <div className="flex items-center justify-around px-6 pt-5" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 22px)" }}>
        {shot ? (
          <>
            <button type="button" onClick={retake} className="flex min-w-24 flex-col items-center gap-1 text-sm font-bold">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/15">
                <Icon name="undo" size={22} />
              </span>
              Ulangi
            </button>
            <button
              type="button"
              onClick={() => confirm(shot.blob)}
              className="flex h-14 items-center gap-2 rounded-full bg-pink px-7 text-base font-bold text-white shadow-[0_8px_24px_rgba(255,122,147,.45)]"
            >
              {confirmLabel} <Icon name="send" size={20} />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex min-w-16 flex-col items-center gap-1 text-xs font-bold">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                <Icon name="image" size={22} />
              </span>
              Galeri
            </button>
            <button
              type="button"
              onClick={snap}
              disabled={!ready}
              aria-label="Jepret"
              className="flex size-[78px] items-center justify-center rounded-full border-[5px] border-white disabled:opacity-40"
            >
              <span className="size-[60px] rounded-full bg-white transition-transform active:scale-90" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFacing((f) => (f === "user" ? "environment" : "user"));
                play("tap");
              }}
              className="flex min-w-16 flex-col items-center gap-1 text-xs font-bold"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-white/15">
                <Icon name="flip" size={22} />
              </span>
              Balik
            </button>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Pilih foto dari galeri"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) confirm(f);
        }}
      />
    </div>,
    document.body,
  );
}
