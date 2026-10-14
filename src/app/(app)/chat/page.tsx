import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { daysBetween, formatShort } from "@/lib/dates";
import { signedUrls } from "@/lib/storage";
import type { ChatMessage } from "./actions";
import { ChatView } from "./chat-view";

export const metadata: Metadata = { title: "Chat" };

async function ChatContent() {
  const supabase = await createClient();
  const now = new Date();

  // Pesan, jadwal, dan data akun diambil bersamaan (RLS menjaga datanya).
  const [viewer, msgRes, nextRes] = await Promise.all([
    requireCouple(),
    supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(60),
    supabase
      .from("meetings")
      .select("title, starts_at")
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const list = ((msgRes.data ?? []) as ChatMessage[]).reverse();
  const urls = await signedUrls(supabase, list.flatMap((m) => [m.thumb_path, m.media_path]));
  const initial = list.map((m) =>
    m.media_path ? { ...m, url: urls[m.thumb_path ?? m.media_path] ?? urls[m.media_path], fullUrl: urls[m.media_path] } : m,
  );

  let nextMeeting: string | null = null;
  if (nextRes.data) {
    const d = daysBetween(now, nextRes.data.starts_at);
    nextMeeting = d === 0 ? `Ketemu hari ini · ${nextRes.data.title}` : `Ketemu lagi ${formatShort(nextRes.data.starts_at)} · ${d} hari`;
  }

  return (
    <ChatView
      coupleId={viewer.couple.id}
      me={{ id: viewer.userId, name: viewer.profile.display_name, avatar: viewer.profile.avatar_url }}
      partner={viewer.partner ? { id: viewer.partner.id, name: viewer.partner.display_name, avatar: viewer.partner.avatar_url } : null}
      initial={initial}
      nextMeeting={nextMeeting}
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh flex-col gap-3 p-4">
          <Skeleton className="h-20" />
          <Skeleton className="flex-1" />
          <Skeleton className="h-24" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
