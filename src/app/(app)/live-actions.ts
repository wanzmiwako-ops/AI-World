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
