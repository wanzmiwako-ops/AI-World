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

/**
 * Data Access Layer: satu-satunya tempat membaca sesi.
 * Dibungkus cache() supaya dalam satu request hanya dibaca sekali.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // createClient() membaca cookies(), jadi halaman ini selalu dirender per request.
  const supabase = await createClient();
  if (!isSupabaseConfigured) redirect("/login");
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const userId = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : "";

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("couple_members").select("couple_id").eq("user_id", userId).maybeSingle(),
  ]);

  let couple: Couple | null = null;
  let partner: Profile | null = null;

  if (member?.couple_id) {
    const [{ data: c }, { data: others }] = await Promise.all([
      supabase.from("couples").select("id, name, anniversary, invite_code, created_at").eq("id", member.couple_id).single(),
      supabase.from("couple_members").select("user_id").eq("couple_id", member.couple_id).neq("user_id", userId),
    ]);
    couple = (c as Couple) ?? null;
    const partnerId = others?.[0]?.user_id as string | undefined;
    if (partnerId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", partnerId)
        .maybeSingle();
      partner = (p as Profile) ?? null;
    }
  }

  return {
    userId,
    email,
    profile: (profile as Profile) ?? { id: userId, display_name: email.split("@")[0], avatar_url: null },
    couple,
    partner,
  };
});

/** Untuk halaman yang butuh ruang pasangan. Belum punya → ke onboarding. */
export async function requireCouple() {
  const viewer = await getViewer();
  if (!viewer.couple) redirect("/onboarding");
  return viewer as Viewer & { couple: Couple };
}
