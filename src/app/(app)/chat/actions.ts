"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { signedUrls } from "@/lib/storage";
import type { Message } from "@/lib/types";

export type ChatMessage = Message & { url?: string };

const KINDS = ["text", "heart", "photo", "sticker"] as const;

export async function sendMessage(input: { kind: Message["kind"]; body?: string | null; mediaPath?: string | null }) {
  const viewer = await requireCouple();
  if (!KINDS.includes(input.kind)) return { error: "Jenis pesan tidak dikenal." };
  const body = input.body?.trim().slice(0, 2000) || null;
  if (input.kind === "text" && !body) return { error: "Pesan kosong." };
  if (input.mediaPath && !input.mediaPath.startsWith(`${viewer.couple.id}/`)) return { error: "Lokasi foto tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      couple_id: viewer.couple.id,
      sender_id: viewer.userId,
      kind: input.kind,
      body,
      media_path: input.mediaPath ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  const message = data as ChatMessage;
  if (message.media_path) {
    const urls = await signedUrls(supabase, [message.media_path]);
    message.url = urls[message.media_path];
  }
  return { ok: true, message };
}

export async function markRead() {
  await requireCouple();
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read");
}

export async function loadOlder(beforeIso: string) {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("couple_id", viewer.couple.id)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(40);
  const list = ((data ?? []) as ChatMessage[]).reverse();
  const urls = await signedUrls(supabase, list.map((m) => m.media_path ?? ""));
  return list.map((m) => ({ ...m, url: m.media_path ? urls[m.media_path] : undefined }));
}
