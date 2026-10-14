import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page, PageHeader, PageSkeleton, Avatar, Bubbles, ThemeArt } from "@/components/ui";
import { CatPair } from "@/components/cat";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { GAMES, TONE, gameInfo } from "@/lib/games/catalog";
import { StartGameButton } from "./start-button";

export const metadata: Metadata = { title: "Main Bareng" };

type Overview = {
  active: { id: string; kind: string; turn: string | null; created_by: string; updated_at: string }[];
  wins: Record<string, number>;
  played: number;
  best_sehati: number | null;
  tts_done: number;
};

async function Games() {
  const supabase = await createClient();
  const [viewer, { data }] = await Promise.all([requireCouple(), supabase.rpc("games_overview")]);
  const o = (data ?? { active: [], wins: {}, played: 0, best_sehati: null, tts_done: 0 }) as Overview;
  const me = viewer.userId;
  const partner = viewer.partner;
  const activeByKind = new Map(o.active.map((g) => [g.kind, g]));
  const myWins = o.wins[me] ?? 0;
  const theirWins = partner ? (o.wins[partner.id] ?? 0) : 0;

  return (
    <>
      <PageHeader title="Main Bareng" subtitle="Game kecil buat makin kompak" back="/" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Papan skor */}
        <section className="hero relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[30px] p-6 lg:col-span-2">
          <Bubbles />
          <ThemeArt className="-right-4 -bottom-6 opacity-30" size={150} />
          <span className="relative text-sm font-bold opacity-90">Papan skor kita</span>
          <div className="relative flex items-center gap-4">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <Avatar name={viewer.profile.display_name} url={viewer.profile.avatar_url} size={56} />
              <span className="max-w-full truncate text-sm font-bold">{viewer.profile.display_name}</span>
              <span className="font-display text-[44px] leading-none font-semibold">{myWins}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CatPair size={64} motion="bob" />
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">menang</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <Avatar name={partner?.display_name ?? "?"} url={partner?.avatar_url} size={56} tone="aqua" />
              <span className="max-w-full truncate text-sm font-bold">{partner?.display_name ?? "Pasangan"}</span>
              <span className="font-display text-[44px] leading-none font-semibold">{theirWins}</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <div className="card flex animate-rise flex-col gap-0.5 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <span className="text-[13px] font-bold text-muted">Sudah main</span>
            <span className="font-display text-[28px] leading-none font-semibold">{o.played}</span>
          </div>
          <div className="card flex animate-rise flex-col gap-0.5 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <span className="text-[13px] font-bold text-muted">Sehati terbaik</span>
            <span className="font-display text-[28px] leading-none font-semibold">{o.best_sehati ?? "–"}<span className="text-base">/10</span></span>
          </div>
          <div className="card flex animate-rise flex-col gap-0.5 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <span className="text-[13px] font-bold text-muted">TTS selesai</span>
            <span className="font-display text-[28px] leading-none font-semibold">{o.tts_done}</span>
          </div>
        </section>
      </div>

      {o.active.length > 0 && (
        <section className="flex animate-rise flex-col gap-3">
          <h2 className="font-display text-xl font-medium">Lagi berjalan</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {o.active.map((g) => {
              const info = gameInfo(g.kind);
              const myTurn = g.turn === me;
              return (
                <Link key={g.id} href={`/main/${g.id}`} className="card tap flex items-center gap-3 p-4">
                  <span className={`flex size-12 items-center justify-center rounded-2xl text-2xl ${TONE[info.tone]}`}>{info.emoji}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-bold">{info.name}</span>
                    <span className={`text-[13px] ${myTurn ? "font-bold text-ocean" : "text-muted"}`}>
                      {g.turn ? (myTurn ? "Giliranmu!" : `Giliran ${partner?.display_name ?? "pasangan"}`) : "Main bareng"}
                    </span>
                  </span>
                  {myTurn && <span className="size-2.5 rounded-full bg-pink" style={{ animation: "beat 1.6s ease-in-out infinite" }} />}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-medium">Pilih game</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {GAMES.map((g, i) => {
            const active = activeByKind.get(g.kind);
            return (
              <article
                key={g.kind}
                className="card flex animate-rise flex-col gap-3 p-5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex size-14 shrink-0 items-center justify-center rounded-[20px] text-[30px] ${TONE[g.tone]}`}
                    style={{ animation: `bob ${3 + i * 0.3}s ease-in-out infinite` }}
                  >
                    {g.emoji}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <h3 className="font-display text-xl leading-tight font-semibold">{g.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-sky px-2.5 py-0.5 text-xs font-bold text-ink-soft">{g.mode}</span>
                      <span className="rounded-full bg-sky px-2.5 py-0.5 text-xs font-bold text-ink-soft">{g.time}</span>
                    </div>
                  </div>
                </div>
                <p className="flex-1 text-sm text-ink-soft">{g.desc}</p>
                <div className="flex gap-2">
                  {active ? (
                    <>
                      <Link href={`/main/${active.id}`} className="btn btn-primary min-h-12 flex-1 px-4 text-base">
                        Lanjutkan
                      </Link>
                      <StartGameButton kind={g.kind} disabled={!partner} variant="ghost">
                        Baru
                      </StartGameButton>
                    </>
                  ) : (
                    <StartGameButton kind={g.kind} disabled={!partner}>
                      Ajak main
                    </StartGameButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!partner && <p className="text-sm text-muted">Sambungkan dulu dengan pasanganmu di Akun supaya bisa main berdua.</p>}
      </section>
    </>
  );
}

export default function MainPage() {
  return (
    <Page>
      <Suspense fallback={<div className="pt-[max(calc(env(safe-area-inset-top)+16px),24px)]"><PageSkeleton /></div>}>
        <Games />
      </Suspense>
    </Page>
  );
}
