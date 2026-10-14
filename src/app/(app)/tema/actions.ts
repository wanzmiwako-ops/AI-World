"use server";

import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { isThemeId } from "@/lib/themes";

export async function saveTheme(theme: string) {
  if (!isThemeId(theme)) return { error: "Tema tidak dikenal." };
  await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_theme", { p_theme: theme });
  if (error) return { error: "Gagal menyimpan tema. Coba lagi, ya." };
  return { ok: true };
}
