import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Couple, Profile } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string;
  profile: Profile;
  couple: Couple | null;
  partner: Profile | null;
};

type AppContext = {
  user_id: string;
  email: string | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
} | null;

/**
 * Data Access Layer: satu-satunya tempat membaca sesi.
 * Profil, ruang pasangan, dan profil pasangan diambil dalam SATU panggilan
 * (fungsi database app_context). Identitas user diverifikasi database dari
 * token login, jadi aman. Dibungkus cache() supaya per request hanya sekali.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // createClient() membaca cookies(), jadi halaman ini selalu dirender per request.
  const supabase = await createClient();
  if (!isSupabaseConfigured) redirect("/login");

  const { data, error } = await supabase.rpc("app_context");
  const ctx = data as AppContext;
  if (error || !ctx?.user_id) redirect("/login");

  const email = ctx.email ?? "";
  return {
    userId: ctx.user_id,
    email,
    profile: ctx.profile ?? { id: ctx.user_id, display_name: email.split("@")[0], avatar_url: null },
    couple: ctx.couple,
    partner: ctx.partner,
  };
});

/** Untuk halaman yang butuh ruang pasangan. Belum punya → ke onboarding. */
export async function requireCouple() {
  const viewer = await getViewer();
  if (!viewer.couple) redirect("/onboarding");
  return viewer as Viewer & { couple: Couple };
}
