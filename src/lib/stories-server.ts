import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signedUrls } from "@/lib/storage";
import { EMPTY_FEED, type Story, type StoryFeed } from "@/lib/stories";

/**
 * Story aktif + Sorotan, lengkap dengan URL sementara.
 * Sekalian membersihkan story kedaluwarsa (berikut filenya) di belakang layar.
 */
export async function loadStoryFeed(supabase: SupabaseClient): Promise<StoryFeed> {
  after(async () => {
    const { data } = await supabase.rpc("story_cleanup");
    const paths = (data ?? []) as string[];
    if (paths.length) await supabase.storage.from("gallery").remove(paths);
  });

  const { data } = await supabase.rpc("story_feed");
  const feed = (data ?? EMPTY_FEED) as StoryFeed;
  const all: Story[] = [...feed.stories, ...feed.highlights.flatMap((h) => h.stories)];
  if (!all.length) return { stories: feed.stories ?? [], highlights: feed.highlights ?? [] };

  const urls = await signedUrls(supabase, all.flatMap((s) => [s.media_path, s.thumb_path]));
  const sign = (s: Story): Story => ({ ...s, url: urls[s.media_path], thumbUrl: (s.thumb_path && urls[s.thumb_path]) || urls[s.media_path] });
  return {
    stories: feed.stories.map(sign),
    highlights: feed.highlights.map((h) => ({ ...h, stories: h.stories.map(sign) })),
  };
}
