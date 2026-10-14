"use server";

import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { messagePreview, notifyPartner } from "@/lib/push";
import { requireCouple } from "@/lib/dal";
import { signedUrls } from "@/lib/storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@/lib/types";
import { MESSAGE_COLS } from "@/lib/chat";

export type ReplyRef = Pick<Message, "id" | "sender_id" | "kind" | "body">;
export type ChatMessage = Message & { url?: string; fullUrl?: string; reply?: ReplyRef | null };

const KINDS = ["text", "heart", "photo", "sticker"] as const;

export async function sendMessage(input: {
  kind: Message["kind"];
  body?: string | null;
  mediaPath?: string | null;
  thumbPath?: string | null;
  replyTo?: string | null;
}) {
  const viewer = await requireCouple();
  if (!KINDS.includes(input.kind)) return { error: "Jenis pesan tidak dikenal." };
  const body = input.body?.trim().slice(0, 2000) || null;
  if (input.kind === "text" && !body) return { error: "Pesan kosong." };
  const prefix = `${viewer.couple.id}/`;
  const replyTo = input.replyTo && /^[0-9a-f-]{36}$/i.test(input.replyTo) ? input.replyTo : null;
  if ((input.mediaPath && !input.mediaPath.startsWith(prefix)) || (input.thumbPath && !input.thumbPath.startsWith(prefix))) {
    return { error: "Lokasi foto tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      couple_id: viewer.couple.id,
      sender_id: viewer.userId,
      kind: input.kind,
      body,
      media_path: input.mediaPath ?? null,
      thumb_path: input.thumbPath ?? null,
      reply_to: replyTo,
    })
    .select(MESSAGE_COLS)
    .single();
  if (error) return { error: error.message };

  const [message] = await withPhotoUrls(supabase, [data as ChatMessage]);
  after(() =>
    notifyPartner(supabase, {
      title: viewer.profile.display_name,
      body: replyTo ? `↩ ${messagePreview(input.kind, body)}` : messagePreview(input.kind, body),
      url: "/chat",
      tag: "chat",
    }),
  );
  return { ok: true, message };
}

export async function markRead() {
  await requireCouple();
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read");
}

export async function loadOlder(beforeIso: string) {
  await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_COLS)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(40);
  return withPhotoUrls(supabase, ((data ?? []) as ChatMessage[]).reverse());
}

/** Tanda tangani URL thumbnail (untuk bubble) dan foto penuh (saat dibuka) sekaligus. */
async function withPhotoUrls(supabase: SupabaseClient, list: ChatMessage[]): Promise<ChatMessage[]> {
  const urls = await signedUrls(supabase, list.flatMap((m) => [m.thumb_path, m.media_path]));
  return list.map((m) =>
    m.media_path
      ? { ...m, url: urls[m.thumb_path ?? m.media_path] ?? urls[m.media_path], fullUrl: urls[m.media_path] }
      : m,
  );
}
