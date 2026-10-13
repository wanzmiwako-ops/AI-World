import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** URL sementara (1 jam) untuk foto privat di bucket "gallery". */
export async function signedUrls(supabase: SupabaseClient, paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from("gallery").createSignedUrls(unique, 3600);
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}
