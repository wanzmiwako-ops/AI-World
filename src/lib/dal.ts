import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readUnlockToken } from "@/lib/pin";
import type { Couple, Profile } from "@/lib/types";

export type Partner = Profile & { last_active_at: string | null };

export type Viewer = {
  userId: string;
  email: string;
  profile: Profile;
  couple: Couple | null;
  partner: Partner | null;
  unread: number;
  pinEnabled: boolean;
  lockMinutes: number;
  unlocked: boolean;
};

type AppContext = {
  user_id: string;
  email: string | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Partner | null;
  unread: number | null;
  pin_enabled: boolean;
  lock_minutes: number;
  unlocked: boolean;
} | null;

/**
 * Data Access Layer: satu-satunya tempat membaca sesi.
 * Profil, ruang pasangan, pasangan, status PIN, dan jumlah pesan belum dibaca
 * diambil dalam SATU panggilan database (app_context). Identitas user
 * diverifikasi database dari token login, jadi aman.
 */
const loadViewer = cache(async (): Promise<Viewer> => {
  // createClient() membaca cookies(), jadi halaman ini selalu dirender per request.
  const supabase = await createClient();
  if (!isSupabaseConfigured) redirect("/login");

  const token = await readUnlockToken();
  const { data, error } = await supabase.rpc("app_context", { p_unlock: token });
  const ctx = data as AppContext;
  if (error || !ctx?.user_id) redirect("/login");

  const email = ctx.email ?? "";
  return {
    userId: ctx.user_id,
    email,
    profile: ctx.profile ?? { id: ctx.user_id, display_name: email.split("@")[0], avatar_url: null },
    couple: ctx.couple,
    partner: ctx.partner,
    unread: ctx.unread ?? 0,
    pinEnabled: Boolean(ctx.pin_enabled),
    lockMinutes: ctx.lock_minutes ?? 5,
    unlocked: Boolean(ctx.unlocked),
  };
});

/** Data akun tanpa memeriksa kunci PIN (hanya untuk halaman /kunci). */
export const getViewerEvenIfLocked = loadViewer;

/** Data akun yang sedang login. Kalau PIN aktif dan terkunci → ke halaman PIN. */
export async function getViewer() {
  const viewer = await loadViewer();
  if (viewer.pinEnabled && !viewer.unlocked) {
    const path = (await headers()).get("x-pathname") ?? "/";
    redirect(`/kunci?next=${encodeURIComponent(path)}`);
  }
  return viewer;
}

/** Untuk halaman yang butuh ruang pasangan. Belum punya → ke onboarding. */
export async function requireCouple() {
  const viewer = await getViewer();
  if (!viewer.couple) redirect("/onboarding");
  return viewer as Viewer & { couple: Couple };
}
