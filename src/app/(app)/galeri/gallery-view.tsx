"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addPhotos, deletePhoto } from "./actions";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/image";

export type GalleryPhoto = { id: string; url: string; fullPath: string; caption: string | null; uploader: string };
export type Album = { key: string; title: string; meta: string; badge: string | null; photos: GalleryPhoto[] };

export function UploadButton({ coupleId }: { coupleId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();

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
            const res = await uploadPhoto(supabase, file, `${coupleId}/galeri`);
            if ("error" in res) setError(`Gagal mengunggah ${file.name}: ${res.error}`);
            else items.push({ path: res.path, thumbPath: res.thumbPath });
            done += 1;
            setProgress(`Mengunggah ${done}/${files.length}…`);
          }
        }),
      );
      if (items.length) {
        const res = await addPhotos(items, null);
        if (res.error) setError(res.error);
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
        <div className="fixed inset-x-4 bottom-28 z-50 lg:left-auto lg:w-96">
          <FormMessage state={{ error }} />
        </div>
      )}
    </>
  );
}

function Lightbox({ photo, onClose }: { photo: GalleryPhoto; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [full, setFull] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createClient()
      .storage.from("gallery")
      .createSignedUrl(photo.fullPath, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setFull(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [photo.fullPath]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-50 flex flex-col bg-navy/95 p-4 text-white" onClick={onClose}>
      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Hapus foto ini dari galeri?")) start(async () => {
              await deletePhoto(photo.id);
              onClose();
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
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={full ?? photo.url} alt={photo.caption ?? "Foto kenangan"} className="max-h-full max-w-full rounded-2xl object-contain" />
      </div>
      <p className="text-center text-sm opacity-80">
        {photo.caption ? `${photo.caption} · ` : ""}diunggah {photo.uploader}
      </p>
    </div>
  );
}

export function GalleryView({ albums, all }: { albums: Album[]; all: GalleryPhoto[] }) {
  const [view, setView] = useState<"album" | "all">("album");
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

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
              <div className="grid h-[182px] grid-cols-[2fr_1fr] grid-rows-2 gap-1.5">
                {a.photos.slice(0, 3).map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpen(p)}
                    className={`overflow-hidden rounded-[18px] bg-tint ${i === 0 ? "row-span-2" : ""} ${a.photos.length === 1 ? "col-span-2" : ""}`}
                    aria-label="Lihat foto"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
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
          {all.map((p) => (
            <button key={p.id} type="button" onClick={() => setOpen(p)} className="aspect-square overflow-hidden rounded-xl bg-tint" aria-label="Lihat foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && <Lightbox photo={open} onClose={() => setOpen(null)} />}
    </>
  );
}
