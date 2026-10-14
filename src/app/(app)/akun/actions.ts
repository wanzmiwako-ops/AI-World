"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/dal";
import { authErrorMessage } from "@/lib/site-url";
import { readUnlockToken, setUnlockToken } from "@/lib/pin";
import { notifySelf } from "@/lib/push";
import type { ActionState } from "@/lib/types";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) return { error: "Nama tidak boleh kosong." };
  if (name.length > 40) return { error: "Nama maksimal 40 karakter." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", viewer.userId);
  if (error) return { error: error.message };
  refresh();
  return { ok: true, message: "Nama tersimpan." };
}

/** Dipanggil setelah foto profil selesai diunggah dari browser. */
export async function saveAvatar(path: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!path.startsWith(`${viewer.userId}/`)) return { error: "Lokasi foto tidak valid." };

  const supabase = await createClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("id", viewer.userId);
  if (error) return { error: error.message };
  refresh();
  return { ok: true, message: "Foto profil diperbarui." };
}

export async function removeAvatar(): Promise<ActionState> {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: files } = await supabase.storage.from("avatars").list(viewer.userId);
  if (files?.length) {
    await supabase.storage.from("avatars").remove(files.map((f) => `${viewer.userId}/${f.name}`));
  }
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", viewer.userId);
  refresh();
  return { ok: true, message: "Foto profil dihapus." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Isi kata sandi lama kamu." };
  if (next.length < 8) return { error: "Kata sandi baru minimal 8 karakter." };
  if (next !== confirm) return { error: "Konfirmasi kata sandi tidak sama." };
  if (next === current) return { error: "Kata sandi baru harus berbeda dari yang lama." };

  const supabase = await createClient();
  // Pastikan yang mengganti memang pemilik akun
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (verifyError) return { error: "Kata sandi lama salah." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: authErrorMessage(error.message) };
  return { ok: true, message: "Kata sandi berhasil diganti." };
}

/** Untuk link "lupa kata sandi" dari email (tanpa kata sandi lama). */
export async function setNewPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getViewer();
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "Kata sandi baru minimal 8 karakter." };
  if (next !== confirm) return { error: "Konfirmasi kata sandi tidak sama." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: authErrorMessage(error.message) };
  redirect("/akun?password=baru");
}

export async function updateCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.couple) return { error: "Belum terhubung dengan pasangan." };
  const anniversary = String(formData.get("anniversary") ?? "") || null;
  const supabase = await createClient();
  const { error } = await supabase.from("couples").update({ anniversary }).eq("id", viewer.couple.id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true, message: "Tanggal jadian tersimpan." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await setUnlockToken(null);
  redirect("/login");
}

/* ---------------- Kunci PIN ---------------- */

export async function savePin(pin: string, current: string | null, minutes: number | null) {
  await getViewer();
  if (!/^[0-9]{4}$/.test(pin)) return { error: "PIN harus 4 angka." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_pin", { p_pin: pin, p_current: current, p_lock_minutes: minutes });
  if (error) return { error: error.message };
  if (!data) return { error: "PIN lama salah (atau terlalu sering salah, tunggu sebentar)." };
  await setUnlockToken(data as string);
  refresh();
  return { ok: true };
}

export async function removePin(current: string) {
  await getViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_pin", { p_current: current });
  if (error || data === false) return { error: "PIN salah (atau terlalu sering salah, tunggu sebentar)." };
  await setUnlockToken(null);
  refresh();
  return { ok: true };
}

export async function saveLockMinutes(minutes: number) {
  await getViewer();
  const supabase = await createClient();
  await supabase.rpc("set_lock_minutes", { p_minutes: minutes });
  refresh();
  return { ok: true };
}

export async function lockNow() {
  const supabase = await createClient();
  const token = await readUnlockToken();
  if (token) await supabase.rpc("lock_now", { p_unlock: token });
  await setUnlockToken(null);
  redirect("/kunci");
}

/* ---------------- Notifikasi push ---------------- */

type SubJSON = { endpoint: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSubscription(sub: SubJSON) {
  const viewer = await getViewer();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Langganan tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, user_id: viewer.userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  await getViewer();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

export async function sendTestPush() {
  const viewer = await getViewer();
  const supabase = await createClient();
  return notifySelf(supabase, {
    title: "A&I WORLD",
    body: `Notifikasi sudah aktif, ${viewer.profile.display_name}! Mochi & Boba siap mengabari.`,
    url: "/",
    tag: "test",
    force: true,
  });
}
