import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/live/live-refresh";
import { Bubbles, Page, PageHeader, PageSkeleton } from "@/components/ui";
import { Cat } from "@/components/cat";
import { HighlightsRow } from "@/components/story/story-bar";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { loadStoryFeed } from "@/lib/stories-server";
import { dayKey, daysBetween } from "@/lib/dates";
import { TimelineList, type TimelineEvent } from "./timeline-list";

export const metadata: Metadata = { title: "Timeline" };

const MOOD_EMOJI: Record<string, string> = { Seneng: "😊", Seru: "🤩", Santai: "😌", Baper: "🥺" };

async function TimelineContent() {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const [viewer, meetings, checkins, photos, issues, firstMsg, feed, otd] = await Promise.all([
    requireCouple(),
    supabase.from("meetings").select("id, title, place, starts_at").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(200),
    supabase.from("checkin_sessions").select("id, place, together_at, mood, note").not("together_at", "is", null).order("together_at", { ascending: false }).limit(200),
    supabase.from("photos").select("id, storage_path, thumb_path, caption, created_at").order("created_at", { ascending: false }).limit(400),
    supabase.from("issues").select("id, title, agreement, resolved_at").eq("status", "resolved").not("resolved_at", "is", null).order("resolved_at", { ascending: false }).limit(100),
    supabase.from("messages").select("created_at, kind, body").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    loadStoryFeed(supabase),
    supabase.rpc("on_this_day"),
  ]);

  const partnerName = viewer.partner?.display_name ?? "pasanganmu";
  const startIso = viewer.couple.anniversary ? `${viewer.couple.anniversary}T12:00:00+07:00` : viewer.couple.created_at;
  const days = Math.max(0, daysBetween(startIso, now));
  const events: TimelineEvent[] = [];

  // Foto dikelompokkan per hari (maks. 4 gambar kecil per hari)
  const photoRows = photos.data ?? [];
  const byDay = new Map<string, typeof photoRows>();
  for (const p of photoRows) {
    const k = dayKey(p.created_at);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }
  const otdRows = (otd.data ?? []) as { id: string; storage_path: string; thumb_path: string | null; created_at: string }[];
  const urls = await signedUrls(supabase, [
    ...[...byDay.values()].flatMap((list) => list.slice(0, 4).map((p) => p.thumb_path ?? p.storage_path)),
    ...otdRows.map((p) => p.thumb_path ?? p.storage_path),
  ]);
  for (const [k, list] of byDay) {
    const caption = list.find((p) => p.caption)?.caption;
    events.push({
      key: `photo-${k}`,
      at: list[0].created_at,
      kind: "foto",
      emoji: "📸",
      title: list.length > 1 ? `${list.length} foto kenangan` : "Foto kenangan",
      sub: caption ?? undefined,
      href: "/galeri",
      thumbs: list.slice(0, 4).map((p) => urls[p.thumb_path ?? p.storage_path]).filter(Boolean),
    });
  }

  for (const c of checkins.data ?? []) {
    events.push({
      key: `checkin-${c.id}`,
      at: c.together_at as string,
      kind: "ketemu",
      emoji: c.mood && MOOD_EMOJI[c.mood] ? MOOD_EMOJI[c.mood] : "📍",
      title: c.place ? `Ketemuan di ${c.place}` : "Ketemuan bareng",
      sub: c.note ?? undefined,
      href: "/ketemu",
    });
  }
  for (const m of meetings.data ?? []) {
    events.push({ key: `meet-${m.id}`, at: m.starts_at, kind: "ketemu", emoji: "🗓️", title: m.title, sub: m.place ?? undefined, href: "/kalender" });
  }
  for (const i of issues.data ?? []) {
    events.push({ key: `issue-${i.id}`, at: i.resolved_at as string, kind: "momen", emoji: "🤝", title: `Sepakat: ${i.title}`, sub: i.agreement ?? undefined, href: "/ruang-bicara" });
  }
  for (const h of feed.highlights) {
    const first = h.stories[0];
    if (!first) continue;
    events.push({
      key: `hl-${h.id}`,
      at: first.created_at,
      kind: "momen",
      emoji: h.emoji ?? "⭐",
      title: `Sorotan: ${h.title}`,
      sub: `${h.stories.length} story tersimpan`,
      thumbs: h.stories.slice(-3).map((s) => s.thumbUrl).filter((u): u is string => Boolean(u)),
      tall: true,
    });
  }
  if (firstMsg.data) {
    events.push({ key: "first-msg", at: firstMsg.data.created_at, kind: "momen", emoji: "💬", title: "Pesan pertama di A&I WORLD", sub: firstMsg.data.kind === "text" ? `“${firstMsg.data.body}”` : undefined, href: "/chat" });
  }

  // Tonggak: hari jadian, tiap 100 hari, & tiap tahun
  events.push({ key: "start", at: startIso, kind: "momen", emoji: "💞", title: viewer.couple.anniversary ? "Hari jadian kalian" : "Dunia kalian dimulai", sub: "Awal dari semuanya ✨", special: true });
  const startMs = new Date(startIso).getTime();
  for (let d = 100; d <= days; d += 100) {
    events.push({ key: `m-${d}`, at: new Date(startMs + d * 86_400_000).toISOString(), kind: "momen", emoji: d % 365 === 0 ? "🎂" : "🎉", title: `Hari ke-${d} bersama!`, special: true });
  }
  if (viewer.couple.anniversary) {
    const [y, mo, da] = viewer.couple.anniversary.split("-").map(Number);
    for (let n = 1; ; n++) {
      const at = new Date(`${y + n}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T12:00:00+07:00`);
      if (at > now) break;
      events.push({ key: `y-${n}`, at: at.toISOString(), kind: "momen", emoji: "🎂", title: `Anniversary ke-${n}!`, sub: `${n} tahun bersama ${partnerName}`, special: true });
    }
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  const meetCount = (checkins.data ?? []).length || (meetings.data ?? []).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="hero relative flex animate-rise flex-col gap-3 overflow-hidden rounded-[30px] p-6">
        <Bubbles />
        <div className="relative flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium opacity-90">
              {viewer.profile.display_name} &amp; {partnerName}
            </span>
            <span className="font-display text-[44px] leading-none font-semibold">{days} hari</span>
            <span className="text-sm font-medium opacity-90">penuh cerita 📖</span>
          </div>
          <Cat variant="boba" size={78} mood="love" motion="hop" />
        </div>
        <div className="relative flex flex-wrap gap-2 text-[13px] font-bold">
          <span className="rounded-full bg-white/20 px-3 py-1">📍 {meetCount}× ketemu</span>
          <span className="rounded-full bg-white/20 px-3 py-1">📸 {photoRows.length}{photoRows.length >= 400 ? "+" : ""} foto</span>
          <span className="rounded-full bg-white/20 px-3 py-1">🤝 {(issues.data ?? []).length} sepakat</span>
        </div>
      </section>

      {feed.highlights.length > 0 && (
        <section className="flex animate-rise flex-col gap-2">
          <h2 className="font-display text-lg font-medium">Sorotan ⭐</h2>
          <HighlightsRow
            feed={feed}
            me={{ id: viewer.userId, name: viewer.profile.display_name, avatar: viewer.profile.avatar_url }}
            partner={viewer.partner ? { id: viewer.partner.id, name: viewer.partner.display_name, avatar: viewer.partner.avatar_url } : null}
          />
        </section>
      )}

      {otdRows.length > 0 && (
        <section className="flex animate-rise flex-col gap-3 rounded-[26px] bg-sand-soft p-5 text-sand-ink">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
            <span style={{ animation: "wiggle 2.6s ease-in-out infinite" }}>🕰️</span> Hari ini, tahun lalu…
          </h2>
          <div className="scroll-row flex gap-2">
            {otdRows.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={urls[p.thumb_path ?? p.storage_path]} alt="" className="size-24 shrink-0 rounded-2xl bg-white object-cover shadow-soft" style={{ transform: `rotate(${i % 2 ? 3 : -3}deg)` }} />
            ))}
          </div>
        </section>
      )}

      <TimelineList events={events} />
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Page>
      <PageHeader title="Timeline" subtitle="Perjalanan cerita kalian" back="/" />
      <LiveRefresh kinds={["meeting", "meeting_deleted", "photo", "issue_resolved", "highlight", "story_deleted"]} />
      <Suspense fallback={<PageSkeleton />}>
        <TimelineContent />
      </Suspense>
    </Page>
  );
}
