"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { readUnlockToken } from "@/lib/pin";
import { notifyPartner } from "@/lib/push";

/** Denyut tiap 30 detik saat aplikasi terbuka: tandai online & cek kunci PIN. */
export async function heartbeat() {
  const supabase = await createClient();
  const token = await readUnlockToken();
  const { data } = await supabase.rpc("touch_active", { p_unlock: token });
  const res = data as { unlocked: boolean } | null;
  return { unlocked: res?.unlocked ?? true };
}

const NUDGE_TEXT: Record<string, (name: string) => string> = {
  kangen: (n) => `${n} kangen kamu 🐾`,
  peluk: (n) => `${n} mengirim pelukan hangat 🤗`,
  cium: (n) => `${n} mengirim cium 😘`,
  semangat: (n) => `${n} bilang: semangat ya hari ini! ✨`,
};

export async function sendNudge(kind: string) {
  if (!(kind in NUDGE_TEXT)) return { error: "Jenis tidak dikenal." };
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase.from("nudges").insert({ couple_id: viewer.couple.id, sender_id: viewer.userId, kind });
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: "A&I WORLD",
      body: NUDGE_TEXT[kind](viewer.profile.display_name),
      url: "/",
      tag: "nudge",
    }),
  );
  return { ok: true };
}

/** Aplikasi ditutup / pindah ke aplikasi lain: pesan berikutnya langsung jadi notifikasi. */
export async function markAway() {
  const supabase = await createClient();
  await supabase.rpc("mark_away");
}

/** Simpan token notifikasi aplikasi Android/iPhone (Firebase) untuk akun ini. */
export async function saveNativeToken(token: string, platform: string) {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) return { error: "Token tidak valid." };
  if (platform !== "android" && platform !== "ios") return { error: "Platform tidak dikenal." };
  await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_native_token", { p_token: token, p_platform: platform });
  return error ? { error: error.message } : { ok: true };
}

export async function removeNativeToken(token: string) {
  const supabase = await createClient();
  await supabase.from("native_push_tokens").delete().eq("token", token);
}
