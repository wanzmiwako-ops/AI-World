"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";

export async function addPhotos(paths: string[], caption: string | null) {
  const viewer = await requireCouple();
  const valid = paths.filter((p) => p.startsWith(`${viewer.couple.id}/`));
  if (!valid.length) return { error: "Tidak ada foto yang valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert(
    valid.map((storage_path) => ({
      couple_id: viewer.couple.id,
      uploaded_by: viewer.userId,
      storage_path,
      caption: caption?.trim() || null,
    })),
  );
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function deletePhoto(id: string) {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase.from("photos").select("storage_path").eq("id", id).eq("couple_id", viewer.couple.id).maybeSingle();
  if (!data) return { error: "Foto tidak ditemukan." };
  await supabase.storage.from("gallery").remove([data.storage_path]);
  await supabase.from("photos").delete().eq("id", id);
  refresh();
  return { ok: true };
}
