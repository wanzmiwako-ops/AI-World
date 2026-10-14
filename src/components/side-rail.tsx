"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { sendNudge } from "@/app/(app)/live-actions";
import { CatPair, Heart } from "@/components/cat";
import { Icon } from "@/components/icon";
import { pageName } from "@/components/partner-status";
import { Avatar, Bubbles, ThemeArt } from "@/components/ui";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { GAMES, TONE, gameInfo } from "@/lib/games/catalog";
import { useLive, useLiveEvent } from "@/lib/live";
import { createClient } from "@/lib/supabase/client";
import { themeInfo } from "@/lib/themes";
import { dayKey, daysBetween, formatShort, formatTime } from "@/lib/dates";
import { ideaOfTheDay } from "@/lib/ideas";

type NextMeeting = { id: string; title: string; place: string | null; starts_at: string } | null;
type ActiveGame = { id: string; kind: string; turn: string | null };

function today() {
  return new Date();
}

/**
 * Panel kanan untuk layar PC lebar: pasangan, game yang berjalan,
 * jadwal berikutnya, dan ide hari ini. Selalu ada, jadi layar tidak terasa kosong.
 */
export function SideRail() {
  const ready = useLive((s) => s.ready);
  const me = useLive((s) => s.me);
  const partner = useLive((s) => s.partner);
  const online = useLive((s) => s.partnerOnline);
  const page = useLive((s) => s.partnerPage);
  const since = useLive((s) => s.since);
  const theme = themeInfo(useLive((s) => s.theme));
  const [next, setNext] = useState<NextMeeting>(null);
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [sent, setSent] = useState(false);
  const [, start] = useTransition();

  const load = useCallback(async () => {
    const supabase = createClient();
    const [m, g] = await Promise.all([
      supabase.from("meetings").select("id, title, place, starts_at").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
      supabase.from("games").select("id, kind, turn").eq("status", "playing").order("updated_at", { ascending: false }).limit(4),
    ]);
    setNext((m.data as NextMeeting) ?? null);
    setGames((g.data as ActiveGame[]) ?? []);
    setNow(today());
  }, []);

  useEffect(() => {
    if (!ready) return;
    // dibungkus supaya setState terjadi setelah efek (bukan langsung di dalamnya)
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [ready, load]);

  useLiveEvent("game", () => void load());
  useLiveEvent("activity", (p) => {
    if (p.kind === "meeting") void load();
  });

  if (!ready || !me) {
    return <div className="flex flex-col gap-4" aria-hidden="true">{[180, 150, 200].map((h) => <div key={h} className="animate-pulse rounded-[26px] bg-white/70" style={{ height: h }} />)}</div>;
  }

  const days = since && now ? Math.max(0, daysBetween(since, now)) : null;
  const where = pageName(page);
  const idea = now ? ideaOfTheDay(dayKey(now)) : null;
  const daysToNext = next && now ? daysBetween(now, next.starts_at) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Dunia kita */}
      <Link href="/tema" className="hero tap relative flex flex-col gap-3 overflow-hidden rounded-[28px] p-5">
        <Bubbles />
        <ThemeArt className="-right-3 -bottom-4 opacity-90" size={88} />
        <span className="relative text-xs font-bold tracking-wide uppercase opacity-80">Dunia kita</span>
        <span className="relative font-display text-[22px] leading-tight font-semibold">{theme.name}</span>
        {days !== null && (
          <span className="relative text-sm font-semibold opacity-90">
            Hari ke-<b className="font-display text-lg">{days}</b> bersama
          </span>
        )}
        <span className="relative mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">
          <Icon name="palette" size={14} /> Ganti tema
        </span>
      </Link>

      {/* Pasangan */}
      {partner && (
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="relative">
              <Avatar name={partner.name} url={partner.avatar} size={48} tone="aqua" />
              <span
                className={`absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-white ${online ? "bg-[#2FBF71]" : "bg-[#B7C6D3]"}`}
                style={online ? { animation: "beat 2s ease-in-out infinite" } : undefined}
              />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-bold">{partner.name}</span>
              <span className="truncate text-[13px] text-muted">{online ? (where ? `Lagi buka ${where}` : "Lagi online") : "Sedang offline"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/chat" className="btn tap min-h-11 bg-tint px-3 text-sm text-ocean">
              <Icon name="chat" size={16} /> Chat
            </Link>
            <button
              type="button"
              disabled={sent}
              className="btn tap min-h-11 bg-pink-soft px-3 text-sm text-[#9b1c3a]"
              onClick={(e) => {
                const { x, y } = centerOf(e.currentTarget);
                burstHearts(x, y, 10);
                play("pop");
                haptic([10, 30, 10]);
                setSent(true);
                start(async () => {
                  await sendNudge("kangen");
                  setTimeout(() => setSent(false), 2500);
                });
              }}
            >
              <Heart size={16} /> {sent ? "Terkirim" : "Kangen"}
            </button>
          </div>
        </section>
      )}

      {/* Main bareng */}
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium">Main bareng</h2>
          <Link href="/main" className="text-sm font-bold text-ocean">Semua</Link>
        </div>
        {games.length > 0 ? (
          games.map((g) => {
            const info = gameInfo(g.kind);
            const mine = g.turn === me.id;
            return (
              <Link key={g.id} href={`/main/${g.id}`} className="tap flex items-center gap-3 rounded-[18px] bg-sky p-2.5">
                <span className={`flex size-10 items-center justify-center rounded-xl text-xl ${TONE[info.tone]}`}>{info.emoji}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{info.name}</span>
                  <span className={`text-xs ${mine ? "font-bold text-ocean" : "text-muted"}`}>{g.turn ? (mine ? "Giliranmu!" : `Giliran ${partner?.name ?? "dia"}`) : "Lagi berjalan"}</span>
                </span>
                {mine && <span className="size-2.5 rounded-full bg-pink" style={{ animation: "beat 1.6s ease-in-out infinite" }} />}
              </Link>
            );
          })
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {GAMES.map((g) => (
              <Link key={g.kind} href="/main" title={g.name} className={`tap flex aspect-square items-center justify-center rounded-2xl text-2xl ${TONE[g.tone]}`}>
                {g.emoji}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Jadwal berikutnya */}
      <Link href="/kalender" className="card tap flex items-center gap-3 p-4">
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-aqua-soft text-aqua-ink">
          {daysToNext !== null ? (
            <>
              <span className="font-display text-lg leading-none font-semibold">{daysToNext}</span>
              <span className="text-[10px] font-bold">hari</span>
            </>
          ) : (
            <Icon name="calendar" />
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{next ? next.title : "Belum ada jadwal ketemu"}</span>
          <span className="truncate text-xs text-muted">
            {next ? `${formatShort(next.starts_at)} · ${formatTime(next.starts_at)}${next.place ? ` · ${next.place}` : ""}` : "Yuk atur kapan ketemu lagi"}
          </span>
        </span>
      </Link>

      {/* Ide hari ini */}
      {idea && (
        <Link href="/ide" className="tap flex flex-col gap-1 rounded-[26px] bg-sand-soft p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-sand-ink">
            <Icon name="sparkle" size={14} /> Ide kencan hari ini
          </span>
          <span className="font-display text-base font-semibold">{idea.title}</span>
          <span className="text-xs text-sand-ink">{idea.desc}</span>
        </Link>
      )}

      <div className="flex justify-center pt-1">
        <CatPair size={54} />
      </div>
    </div>
  );
}
