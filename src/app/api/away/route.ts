import { createClient } from "@/lib/supabase/server";

/**
 * Dipanggil lewat navigator.sendBeacon saat aplikasi ditutup / pindah ke latar belakang.
 * Beacon tetap terkirim walau halaman sedang dibekukan, jadi pesan berikutnya
 * langsung dikirim sebagai notifikasi ke HP.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.rpc("mark_away");
  return new Response(null, { status: 204 });
}
