/** Kolom pesan + ringkasan pesan yang dibalas (satu query, lewat relasi reply_to). */
export const MESSAGE_COLS = "*, reply:reply_to(id, sender_id, kind, body), story:story_id(id, author_id, thumb_path)";

/** Teks singkat untuk kutipan, toast, dan notifikasi. */
export function kindPreview(kind: string, body: string | null | undefined, max = 120) {
  if (kind === "photo") return "📷 Foto";
  if (kind === "heart") return "Mengirim hati ❤";
  if (kind === "sticker") return "🐱 Stiker kucing";
  if (kind === "voice") return "🎤 Voice note";
  const text = (body ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 3)}…` : text;
}
