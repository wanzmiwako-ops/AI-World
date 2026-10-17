/** Lokasi untuk Story & Chat ("lagi di mana"). */
export type Place = { name: string; address?: string | null; lat?: number | null; lng?: number | null };

export function mapsUrl(p: Place) {
  if (typeof p.lat === "number" && typeof p.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address].filter(Boolean).join(", "))}`;
}

/** Bersihkan data lokasi dari HP sebelum disimpan. */
export function cleanPlace(raw: unknown, requireCoords = false): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? "").trim().slice(0, 120);
  if (!name) return null;
  const address = r.address ? String(r.address).trim().slice(0, 200) || null : null;
  const lat = typeof r.lat === "number" && Number.isFinite(r.lat) && Math.abs(r.lat) <= 90 ? Math.round(r.lat * 1e6) / 1e6 : null;
  const lng = typeof r.lng === "number" && Number.isFinite(r.lng) && Math.abs(r.lng) <= 180 ? Math.round(r.lng * 1e6) / 1e6 : null;
  if (requireCoords && (lat === null || lng === null)) return null;
  return { name, address, ...(lat !== null && lng !== null ? { lat, lng } : {}) };
}

export const HASHTAG_RE = /#([\p{L}\p{N}_]{1,40})/gu;

export function cleanTag(t: string) {
  return t.replace(/^#/, "").toLowerCase().replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 40);
}

export function hashtagsIn(text: string | null | undefined) {
  return [...(text ?? "").matchAll(HASHTAG_RE)].map((m) => cleanTag(m[1])).filter(Boolean);
}

export const TAG_IDEAS = ["date", "kencan", "anniversary", "kangen", "jalanjalan", "kuliner", "ootd", "quality_time", "random", "lucu"];
