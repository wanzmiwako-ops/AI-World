import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mengecilkan foto di browser sebelum diunggah (hemat kuota & lebih cepat).
 * Menghasilkan WebP dengan sisi terpanjang maksimal `max` piksel.
 */
export async function resizeImage(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Unggah foto ke galeri dalam dua ukuran sekaligus:
 * - foto penuh (maks. 1600 px) untuk dibuka
 * - thumbnail (maks. 480 px, ±30 KB) untuk grid & chat, supaya halaman ringan
 */
export async function uploadPhoto(supabase: SupabaseClient, file: File, folder: string) {
  const id = randomId();
  const path = `${folder}/${id}.webp`;
  const thumbPath = `${folder}/${id}_t.webp`;
  const [full, thumb] = await Promise.all([resizeImage(file, 1600, 0.85), resizeImage(file, 480, 0.75)]);
  const bucket = supabase.storage.from("gallery");
  const opts = { contentType: "image/webp", cacheControl: "31536000" };
  const [a, b] = await Promise.all([bucket.upload(path, full, opts), bucket.upload(thumbPath, thumb, opts)]);
  if (a.error) return { error: a.error.message };
  return { path, thumbPath: b.error ? null : thumbPath, localUrl: URL.createObjectURL(thumb) };
}
