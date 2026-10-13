/**
 * Mengecilkan foto di browser sebelum diunggah (hemat kuota & lebih cepat).
 * Menghasilkan WebP dengan sisi terpanjang maksimal `max` piksel.
 */
export async function resizeImage(file: File, max = 1600, quality = 0.85): Promise<Blob> {
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
