"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addPhotos, deletePhoto } from "./actions";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/image";
import { attempt, OFFLINE } from "@/lib/offline";

export type GalleryPhoto = { id: string; url: string; fullPath: string; caption: string | null; uploader: string };
export type Album = { key: string; title: string; meta: string; badge: string | null; photos: GalleryPhoto[] };

export function UploadButton({ coupleId }: { coupleId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();

  // Pesan gagal hilang sendiri setelah beberapa detik
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(undefined), 6000);
    return () => clearTimeout(t);
  }, [error]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 20);
    e.target.value = "";
    if (!files.length) return;
    setError(undefined);
    start(async () => {
      const supabase = createClient();
      const items: { path: string; thumbPath: string | null }[] = [];
      let done = 0;
      setProgress(`Mengunggah 0/${files.length}…`);
      // Unggah 3 foto sekaligus supaya cepat tapi tidak membebani HP
      const queue = [...files];
      await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, async () => {
          for (let file = queue.shift(); file; file = queue.shift()) {
            const res = await uploadPhoto(supabase, file, `${coupleId}/galeri`).catch(() => ({ error: OFFLINE }));
            if ("error" in res) setError(`Gagal mengunggah ${file.name}: ${res.error}`);
            else items.push({ path: res.path, thumbPath: res.thumbPath });
            done += 1;
            setProgress(`Mengunggah ${done}/${files.length}…`);
          }
        }),
      );
      if (items.length) {
        const res = await attempt(() => addPhotos(items, null));
        if ("error" in res && res.error) setError(res.error);
      }
      setProgress(undefined);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label="Unggah foto"
        className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-ocean px-4 font-bold text-white shadow-ocean"
      >
        <Icon name="plus" size={20} />
        <span className="text-sm">{progress ?? "Unggah"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={onPick} aria-label="Pilih foto" />
      {error && (
        <button type="button" onClick={() => setError(undefined)} className="fixed inset-x-4 bottom-28 z-50 text-left lg:left-auto lg:w-96">
          <FormMessage state={{ error }} />
        </button>
      )}
    </>
  );
}

function Lightbox({ list, index, onIndex, onClose }: { list: GalleryPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = list[index];
  const [pending, start] = useTransition();
  const [full, setFull] = useState<{ path: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);
  const hasPrev = index > 0;
  const hasNext = index < list.length - 1;

  useEffect(() => {
    let alive = true;
    createClient()
      .storage.from("gallery")
      .createSignedUrl(photo.fullPath, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setFull({ path: photo.fullPath, url: data.signedUrl });
      });
    return () => {
      alive = false;
    };
  }, [photo.fullPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onIndex(index - 1);
      else if (e.key === "ArrowRight" && hasNext) onIndex(index + 1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onIndex, index, hasPrev, hasNext]);

  const src = full && full.path === photo.fullPath ? full.url : photo.url;
  const navBtn = "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 sm:flex";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      className="fixed inset-0 z-50 flex flex-col bg-navy p-4 text-white"
      style={{ paddingTop: "max(env(safe-area-inset-top), 16px)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 50 && hasPrev) onIndex(index - 1);
        else if (dx < -50 && hasNext) onIndex(index + 1);
      }}
    >
      <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-bold opacity-80">
          {index + 1} / {list.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Hapus foto ini dari galeri?"))
                start(async () => {
                  const res = await attempt(() => deletePhoto(photo.id));
                  if ("error" in res && res.error) setError(res.error);
                  else onClose();
                });
            }}
            aria-label="Hapus foto"
            className="flex size-11 items-center justify-center rounded-full bg-white/15"
          >
            <Icon name="trash" size={20} />
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-11 items-center justify-center rounded-full bg-white/15">
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={photo.id} src={src} alt={photo.caption ?? "Foto kenangan"} className="max-h-full max-w-full rounded-2xl object-contain" style={{ animation: "fade-in .2s ease both" }} />
        {hasPrev && (
          <button type="button" aria-label="Foto sebelumnya" className={`${navBtn} left-0`} onClick={(e) => (e.stopPropagation(), onIndex(index - 1))}>
            <Icon name="back" size={22} />
          </button>
        )}
        {hasNext && (
          <button type="button" aria-label="Foto berikutnya" className={`${navBtn} right-0`} onClick={(e) => (e.stopPropagation(), onIndex(index + 1))}>
            <Icon name="next" size={22} />
          </button>
        )}
      </div>
      {error && <p className="pb-2 text-center text-sm font-bold text-pink-soft">{error}</p>}
      <p className="text-center text-sm opacity-80">
        {photo.caption ? `${photo.caption} · ` : ""}diunggah {photo.uploader}
        {list.length > 1 ? " · geser untuk foto lain" : ""}
      </p>
    </div>
  );
}

export function GalleryView({ albums, all }: { albums: Album[]; all: GalleryPhoto[] }) {
  const [view, setView] = useState<"album" | "all">("album");
  const [open, setOpen] = useState<{ list: GalleryPhoto[]; index: number } | null>(null);

  if (!all.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[26px] border-2 border-dashed border-[#C4DCEC] p-8 text-center">
        <Cat variant="mochi" size={96} mood="happy" />
        <p className="text-[15px] text-muted">Galeri masih kosong. Unggah foto pertama kalian, atau ambil foto saat Mode Ketemu.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-[18px] bg-tint p-1 lg:max-w-sm">
        {(
          [
            ["album", "Per ketemuan"],
            ["all", "Semua foto"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={view === k}
            onClick={() => setView(k)}
            className={`min-h-[42px] rounded-[14px] text-sm font-bold ${view === k ? "bg-white text-navy" : "text-ink-soft"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "album" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {albums.map((a) => (
            <article key={a.key} className="card flex animate-rise flex-col gap-3 p-2.5 pb-4">
              <div className={`grid h-[182px] gap-1.5 ${a.photos.length === 1 ? "grid-cols-1" : a.photos.length === 2 ? "grid-cols-2" : "grid-cols-[2fr_1fr] grid-rows-2"}`}>
                {a.photos.slice(0, 3).map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpen({ list: a.photos, index: i })}
                    className={`relative overflow-hidden rounded-[18px] bg-tint ${i === 0 && a.photos.length > 2 ? "row-span-2" : ""}`}
                    aria-label={i === 2 && a.photos.length > 3 ? `Lihat ${a.photos.length} foto` : "Lihat foto"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                    {i === 2 && a.photos.length > 3 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-navy/45 font-display text-2xl font-semibold text-white">
                        +{a.photos.length - 3}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 px-1.5">
                <div className="flex flex-col">
                  <h3 className="font-display text-lg font-medium">{a.title}</h3>
                  <p className="text-[13px] text-muted">{a.meta}</p>
                </div>
                {a.badge && <span className="shrink-0 rounded-[10px] bg-aqua-soft px-2.5 py-1 text-xs font-bold text-aqua-ink">{a.badge}</span>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-5">
          {all.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setOpen({ list: all, index: i })} className="aspect-square overflow-hidden rounded-xl bg-tint" aria-label="Lihat foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && open.list[open.index] && (
        <Lightbox
          list={open.list}
          index={open.index}
          onIndex={(index) => setOpen((o) => (o ? { ...o, index } : o))}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
