import { unstable_rethrow } from "next/navigation";

/** Pesan saat server tidak terjangkau (sinyal putus, dll.). */
export const OFFLINE = "Koneksi terputus. Cek internet, lalu coba lagi.";

/**
 * Jalankan server action dari tombol tanpa membuat halaman error kalau sinyal putus.
 * Redirect/notFound dari Next.js tetap diteruskan seperti biasa.
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    return { error: OFFLINE };
  }
}
