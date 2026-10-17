"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { notifyPartner } from "@/lib/push";
import { sendMessage } from "@/app/(app)/chat/actions";
import { STORY_REACTIONS } from "@/lib/stories";

const UUID = /^[0-9a-f-]{36}$/i;

export async function createStory(input: { mediaPath: string; thumbPath: string | null }) {
  const viewer = await requireCouple();
  const prefix = `${viewer.couple.id}/stories/`;
  if (!input.mediaPath?.startsWith(prefix) || (input.thumbPath && !input.thumbPath.startsWith(prefix))) {
    return { error: "Lokasi foto tidak valid." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({ couple_id: viewer.couple.id, author_id: viewer.userId, media_path: input.mediaPath, thumb_path: input.thumbPath })
    .select("id")
    .single();
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: viewer.profile.display_name,
      body: "Bikin story baru 👀 Lihat yuk!",
      url: "/",
      tag: "story",
    }),
  );
  refresh();
  return { ok: true, id: data.id as string };
}

export async function deleteStory(id: string) {
  await requireCouple();
  if (!UUID.test(id)) return { error: "Story tidak ditemukan." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("stories").delete().eq("id", id).select("media_path, thumb_path").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Story tidak ditemukan." };
  await supabase.storage.from("gallery").remove([data.media_path, data.thumb_path].filter(Boolean) as string[]);
  refresh();
  return { ok: true };
}

/** Tandai sudah dilihat; kalau ada reaksi, ikut dikirim ke chat. */
export async function seeStory(id: string, reaction?: string | null) {
  await requireCouple();
  if (!UUID.test(id)) return { error: "Story tidak ditemukan." };
  const r = reaction && STORY_REACTIONS.includes(reaction) ? reaction : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("story_seen", { p_story: id, p_reaction: r });
  if (error) return { error: error.message };
  if (r) {
    const res = await sendMessage({ kind: "text", body: r, storyId: id });
    if ("error" in res && res.error) return { error: res.error };
  }
  return { ok: true };
}

export async function replyStory(id: string, body: string) {
  await requireCouple();
  if (!UUID.test(id)) return { error: "Story tidak ditemukan." };
  const text = body.trim();
  if (!text) return { error: "Balasan kosong." };
  const supabase = await createClient();
  await supabase.rpc("story_seen", { p_story: id, p_reaction: null });
  return sendMessage({ kind: "text", body: text, storyId: id });
}

export async function setStoryHighlight(storyId: string, highlightId: string | null) {
  await requireCouple();
  if (!UUID.test(storyId) || (highlightId && !UUID.test(highlightId))) return { error: "Data tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("stories").update({ highlight_id: highlightId }).eq("id", storyId).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Story tidak ditemukan." };
  refresh();
  return { ok: true };
}

export async function createHighlight(input: { title: string; emoji: string | null; storyId: string }) {
  const viewer = await requireCouple();
  const title = input.title.trim().slice(0, 30);
  if (!title) return { error: "Kasih nama sorotannya dulu, ya." };
  if (!UUID.test(input.storyId)) return { error: "Story tidak ditemukan." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("highlights")
    .insert({ couple_id: viewer.couple.id, created_by: viewer.userId, title, emoji: input.emoji?.slice(0, 16) || null })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const res = await setStoryHighlight(input.storyId, data.id as string);
  if ("error" in res && res.error) {
    await supabase.from("highlights").delete().eq("id", data.id);
    return res;
  }
  return { ok: true, id: data.id as string };
}

export async function deleteHighlight(id: string) {
  await requireCouple();
  if (!UUID.test(id)) return { error: "Sorotan tidak ditemukan." };
  const supabase = await createClient();
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
