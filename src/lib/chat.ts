/** Kolom pesan + ringkasan pesan yang dibalas (satu query, lewat relasi reply_to). */
export const MESSAGE_COLS = "*, reply:reply_to(id, sender_id, kind, body)";
