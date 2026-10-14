"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewerEvenIfLocked } from "@/lib/dal";
import { setUnlockToken } from "@/lib/pin";

type VerifyResult = { ok: boolean; token?: string | null; remaining?: number; locked_until?: string | null };

export async function unlockWithPin(pin: string) {
  await getViewerEvenIfLocked();
  if (!/^[0-9]{4}$/.test(pin)) return { error: "PIN harus 4 angka." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_pin", { p_pin: pin });
  if (error) return { error: error.message };
  const r = data as VerifyResult;
  if (r.ok) {
    if (r.token) await setUnlockToken(r.token);
    return { ok: true };
  }
  if (r.locked_until && new Date(r.locked_until).getTime() > Date.now()) {
    return { error: "Terlalu banyak salah. Tunggu sebentar, ya.", lockedUntil: r.locked_until };
  }
  return { error: r.remaining === 1 ? "PIN salah. Sisa 1 kesempatan lagi." : "PIN salah, coba lagi.", remaining: r.remaining };
}

export async function resetPinWithPassword(password: string) {
  await getViewerEvenIfLocked();
  if (!password) return { error: "Isi kata sandi akunmu." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_pin_with_password", { p_password: password });
  if (error) return { error: error.message };
  if (!data) return { error: "Kata sandi salah (atau terlalu sering mencoba, tunggu 5 menit)." };
  await setUnlockToken(null);
  return { ok: true };
}

export async function signOutFromLock() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await setUnlockToken(null);
  redirect("/login");
}
