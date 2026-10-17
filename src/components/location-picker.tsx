"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { MapPreview } from "@/components/map-preview";
import { play } from "@/lib/feel";
import type { Place } from "@/lib/geo";

type Coords = { lat: number; lng: number };
type Feature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

const PHOTON = "https://photon.komoot.io";

function toPlace(f: Feature): Place | null {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const area = [p.district || p.locality, p.city || p.county, p.state].filter(Boolean);
  const name = p.name || street || area[0];
  if (!name) return null;
  const address = [p.name ? street : null, ...area].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(", ");
  return { name, address: address || null, lat, lng };
}

function dedupe(list: Place[]) {
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = `${p.name}|${p.address}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function photon(path: string, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(`${PHOTON}${path}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const json = (await res.json()) as { features?: Feature[] };
  return dedupe((json.features ?? []).map(toPlace).filter((p): p is Place => Boolean(p)));
}

async function reverse(c: Coords): Promise<Place[]> {
  try {
    const list = await photon(`/reverse?lat=${c.lat}&lon=${c.lng}&limit=6&radius=0.4`);
    if (list.length) return list;
  } catch {}
  // Cadangan: Nominatim
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=18&accept-language=id`);
  const j = (await res.json()) as { name?: string; display_name?: string };
  const name = j.name || j.display_name?.split(",")[0];
  return name ? [{ name, address: j.display_name?.split(",").slice(1, 4).join(",").trim() || null, ...c }] : [];
}

/**
 * Pilih lokasi: otomatis cari posisi sekarang (GPS) + tempat di sekitarnya,
 * bisa cari nama tempat, atau tulis nama sendiri (mis. "Rumah ayang 🏠").
 */
export function LocationPicker({
  open,
  onClose,
  onPick,
  requireCoords = false,
  title = "Lagi di mana? 📍",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Place) => void;
  requireCoords?: boolean;
  title?: string;
}) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gps, setGps] = useState<"idle" | "loading" | "ok" | "denied" | "error">("idle");
  const [nearby, setNearby] = useState<Place[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(false);

  // Ambil posisi sekarang setiap kali panel dibuka
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(() => {
      if (!("geolocation" in navigator)) return setGps("error");
      setGps((g) => (g === "ok" ? g : "loading"));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!alive) return;
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setGps("ok");
          try {
            const list = await reverse(c);
            if (alive) setNearby(list);
          } catch {
            if (alive) setNearby([]);
          }
        },
        (err) => alive && setGps((g) => (g === "ok" ? g : err.code === err.PERMISSION_DENIED ? "denied" : "error")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open]);

  // Cari tempat (ditunda sebentar selagi mengetik)
  useEffect(() => {
    const text = q.trim();
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      if (text.length < 2) {
        setResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      setSearchErr(false);
      try {
        const bias = coords ? `&lat=${coords.lat}&lon=${coords.lng}` : "&lat=-2.5&lon=118";
        setResults(await photon(`/api/?q=${encodeURIComponent(text)}&limit=8${bias}`, ctl.signal));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setSearchErr(true);
        }
      } finally {
        if (!ctl.signal.aborted) setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, coords]);

  function pick(p: Place) {
    play("pop");
    onPick(p);
    onClose();
    setQ("");
  }

  const custom = q.trim();
  const list = results ?? nearby;
  const canCustom = custom.length > 0 && (!requireCoords || coords);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {coords ? (
        <MapPreview lat={coords.lat} lng={coords.lng} height={120} className="-mt-1 rounded-[20px]" />
      ) : (
        <p className="-mt-2 rounded-2xl bg-white px-4 py-3 text-sm text-ink-soft">
          {gps === "loading"
            ? "Mencari posisimu… 🛰️"
            : gps === "denied"
              ? "Izin lokasi belum diberikan. Kamu tetap bisa cari atau tulis nama tempatnya."
              : "Posisi belum ketemu. Cari atau tulis nama tempatnya, ya."}
        </p>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={120}
        placeholder="Cari tempat, mis. Kopi Kenangan"
        aria-label="Cari tempat"
        className="h-12 rounded-2xl border-2 border-tint bg-white px-4 text-base focus:border-ocean focus:outline-none"
      />

      <div className="flex flex-col gap-2">
        {canCustom && (
          <button type="button" onClick={() => pick({ name: custom, ...(coords ?? {}) })} className="flex items-center gap-3 rounded-[18px] bg-pink-soft p-3 text-left">
            <span className="text-2xl">✍️</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-bold">Pakai “{custom}”</span>
              <span className="text-xs text-ink-soft">{coords ? "dengan posisimu sekarang" : "tanpa titik peta"}</span>
            </span>
          </button>
        )}
        {requireCoords && custom && !coords && <p className="text-xs text-muted">Untuk kirim lokasi di chat, pilih salah satu tempat dari hasil pencarian.</p>}

        {!results && coords && (
          <button type="button" onClick={() => pick({ name: nearby[0]?.name ?? "Lokasiku sekarang", address: nearby[0]?.address ?? null, ...coords })} className="flex items-center gap-3 rounded-[18px] bg-white p-3 text-left shadow-soft">
            <span className="flex size-10 items-center justify-center rounded-full bg-ocean text-lg text-white">◎</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-bold">Lokasiku sekarang</span>
              <span className="truncate text-xs text-muted">{nearby[0] ? [nearby[0].name, nearby[0].address].filter(Boolean).join(" · ") : "titik GPS"}</span>
            </span>
          </button>
        )}

        {searching && <p className="px-1 text-sm text-muted">Mencari…</p>}
        {searchErr && <p className="px-1 text-sm text-muted">Pencarian lagi gangguan. Tulis nama tempatnya lalu pilih “Pakai …”.</p>}
        {results && !searching && !searchErr && results.length === 0 && <p className="px-1 text-sm text-muted">Tidak ketemu. Coba kata lain, atau pakai nama yang kamu tulis.</p>}
        {list.map((p, i) => (
          <button
            key={`${p.name}-${p.lat}-${i}`}
            type="button"
            onClick={() => pick(p)}
            className="flex items-center gap-3 rounded-[18px] bg-white p-3 text-left shadow-soft"
            style={{ animation: `rise .3s ease ${i * 0.03}s both` }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-lg">📍</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-bold">{p.name}</span>
              {p.address && <span className="truncate text-xs text-muted">{p.address}</span>}
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] text-muted">Data tempat © OpenStreetMap</p>
    </Sheet>
  );
}
