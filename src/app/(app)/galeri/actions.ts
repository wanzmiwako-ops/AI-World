"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { notifyPartner } from "@/lib/push";
import { requireCouple } from "@/lib/dal";

export async function addPhotos(items: { path: string; thumbPath: string | null }[], caption: string | null) {
  const viewer = await requireCouple();
  const prefix = `${viewer.couple.id}/`;
  const valid = items
    .slice(0, 50)
    .filter((i) => typeof i.path === "string" && i.path.startsWith(prefix) && !i.path.includes("..") && (!i.thumbPath || i.thumbPath.startsWith(prefix)));
  if (!valid.length) return { error: "Tidak ada foto yang valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert(
    valid.map((i) => ({
      couple_id: viewer.couple.id,
      uploaded_by: viewer.userId,
      storage_path: i.path,
      thumb_path: i.thumbPath,
      caption: caption?.trim().slice(0, 500) || null,
    })),
  );
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: `${viewer.profile.display_name} menambahkan ${valid.length} foto`,
      body: "Kenangan baru di Galeri 📸",
      url: "/galeri",
      tag: "photo",
    }),
  );
  refresh();
  return { ok: true };
}

export async function deletePhoto(id: string) {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase.from("photos").select("storage_path, thumb_path").eq("id", id).eq("couple_id", viewer.couple.id).maybeSingle();
  if (!data) return { error: "Foto tidak ditemukan." };
  await supabase.storage.from("gallery").remove([data.storage_path, data.thumb_path].filter(Boolean) as string[]);
  await supabase.from("photos").delete().eq("id", id);
  refresh();
  return { ok: true };
}
