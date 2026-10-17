import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signedUrls } from "@/lib/storage";
import type { ChatMessage } from "@/app/(app)/chat/actions";

/** URL sementara untuk foto/suara chat + thumbnail story yang dibalas, dalam satu panggilan. */
export async function withMediaUrls(supabase: SupabaseClient, list: ChatMessage[]): Promise<ChatMessage[]> {
  const urls = await signedUrls(
    supabase,
    list.flatMap((m) => [m.thumb_path, m.media_path, m.story?.thumb_path]),
  );
  return list.map((m) => {
    const out: ChatMessage = { ...m };
    if (m.media_path) {
      out.url = urls[m.thumb_path ?? m.media_path] ?? urls[m.media_path];
      out.fullUrl = urls[m.media_path];
    }
    if (m.story?.thumb_path) out.storyUrl = urls[m.story.thumb_path];
    return out;
  });
}
