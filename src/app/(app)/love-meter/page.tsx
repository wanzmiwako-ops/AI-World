import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/live/live-refresh";
import { Cat } from "@/components/cat";
import { LoveHeart, loveTier } from "@/components/love-heart";
import { Bubbles, Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { computeLoveMeter, type LoveStats } from "@/lib/love-meter";
import { MoodPicker } from "./mood-picker";

export const metadata: Metadata = { title: "Love Meter" };

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MOOD_EMOJI = ["", "🥶", "😐", "🙂", "🥰", "😻"];

/** Tiap komponen skor: ikon, warna, dan tombol "naikkan" ke halaman yang relevan. */
const PART_STYLE: Record<string, { emoji: string; bg: string; bar: string; href: string; cta: string }> = {
  "Waktu berkualitas": { emoji: "🗓️", bg: "bg-tint", bar: "bg-ocean", href: "/kalender", cta: "Atur ketemu" },
  Komunikasi: { emoji: "💬", bg: "bg-aqua-soft", bar: "bg-[#2BB3C9]", href: "/chat", cta: "Kirim pesan" },
  "Mood berdua": { emoji: "😊", bg: "bg-sand-soft", bar: "bg-[#F5B83D]", href: "#mood", cta: "Isi mood" },
  "Menyelesaikan masalah": { emoji: "🤝", bg: "bg-pink-soft", bar: "bg-pink", href: "/ruang-bicara", cta: "Ruang Bicara" },
};

async function LoveContent() {
  const supabase = await createClient();
  const [viewer, { data }] = await Promise.all([requireCouple(), supabase.rpc("love_stats")]);
  const love = computeLoveMeter(data as LoveStats | null, viewer.userId);
  const tier = loveTier(love.score);
  const partnerName = viewer.partner?.display_name ?? "Pasangan";
  const lowest = [...love.parts].sort((a, b) => a.value - b.value)[0];

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      {/* Hati utama */}
      <section className="hero relative flex animate-rise flex-col items-center gap-2 overflow-hidden rounded-[32px] px-6 pt-6 pb-7 text-center">
        <Bubbles />
        <span className="relative rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide uppercase">
          {viewer.profile.display_name} 💞 {partnerName}
        </span>
        <div className="relative -mb-1 pt-1">
          <LoveHeart score={love.score} size={230} />
        </div>
        <p className="relative font-display text-[26px] leading-tight font-semibold">
          <span className="mr-1.5 inline-block" style={{ animation: "wiggle 2.4s ease-in-out infinite" }}>
            {tier.emoji}
          </span>
          {tier.label}
        </p>
        <p className="relative max-w-xs text-[13px] opacity-90">Ketuk hatinya! Skor dari ketemu, chat, mood harian, dan masalah yang diselesaikan.</p>
      </section>

      <div className="flex flex-col gap-5">
        <div id="mood" className="scroll-mt-24">
          <MoodPicker mine={love.myMoodToday} partner={love.partnerMoodToday} partnerName={partnerName} />
        </div>

        {/* Rincian skor */}
        <section className="grid animate-rise grid-cols-2 gap-3">
          {love.parts.map((p, i) => {
            const st = PART_STYLE[p.name];
            const weakest = p.name === lowest.name && p.value < 80;
            return (
              <Link
                key={p.name}
                href={st.href}
                className={`tap relative flex flex-col gap-2 overflow-hidden rounded-[24px] p-4 ${st.bg} ${weakest ? "ring-2 ring-pink ring-offset-2 ring-offset-sky" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[26px] leading-none" style={{ animation: `bob ${2.6 + i * 0.3}s ease-in-out infinite` }}>
                    {st.emoji}
                  </span>
                  <span className="font-display text-[26px] leading-none font-semibold tabular-nums">{p.value}</span>
                </div>
                <span className="text-[13px] leading-tight font-bold">{p.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className={`h-2 rounded-full ${st.bar}`}
                    style={{ width: `${p.value}%`, animation: `grow 1.1s cubic-bezier(.2,.8,.2,1) ${0.3 + i * 0.12}s both` }}
                  />
                </div>
                <span className="text-[11px] text-ink-soft">{p.hint}</span>
                {weakest && (
                  <span className="absolute top-2 right-12 rounded-full bg-pink px-2 py-0.5 text-[10px] font-bold text-white" style={{ animation: "beat 1.8s ease-in-out infinite" }}>
                    {st.cta} →
                  </span>
                )}
              </Link>
            );
          })}
        </section>
      </div>

      {/* Mood seminggu */}
      <section className="card flex animate-rise flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium">Mood 7 hari terakhir</h2>
          <span className="text-xs font-bold text-muted">rata-rata berdua</span>
        </div>
        <div className="grid h-36 grid-cols-7 items-end gap-2">
          {love.week.map((w, i) => {
            const today = i === 6;
            const emoji = w.value ? MOOD_EMOJI[Math.round(w.value)] : "";
            return (
              <div key={w.day} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="h-5 text-base leading-none" style={emoji ? { animation: `pop-in .4s ease ${0.4 + i * 0.06}s both` } : undefined}>
                  {emoji}
                </span>
                <div
                  className={`w-full max-w-8 rounded-[10px] ${today ? "bg-pink" : w.value ? "bg-ocean-light/60" : "bg-tint"}`}
                  style={{ height: `${w.value ? 14 + (w.value / 5) * 76 : 8}px`, animation: `rise .5s ease ${i * 0.06}s both` }}
                  title={w.value ? `${w.value.toFixed(1)} dari 5` : "belum ada"}
                />
                <span className={`text-[11px] ${today ? "font-bold text-pink" : "font-medium text-muted"}`}>
                  {today ? "Hari ini" : DAY_NAMES[new Date(`${w.day}T12:00:00+07:00`).getUTCDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saran dari kucing */}
      <section className="flex animate-rise items-end gap-3">
        <Cat variant="boba" size={64} mood="joy" motion="bob" />
        <div className="relative flex-1 rounded-[22px] rounded-bl-[6px] bg-sand-soft px-4 py-3.5 text-sm text-sand-ink shadow-soft">
          <b className="block text-navy">Kata Boba 🐾</b>
          {love.tip}
        </div>
      </section>
    </div>
  );
}

export default function LoveMeterPage() {
  return (
    <Page>
      <PageHeader title="Love Meter" subtitle="Seberapa hangat kalian minggu ini" back="/" />
      <LiveRefresh kinds={["mood"]} />
      <Suspense fallback={<PageSkeleton />}>
        <LoveContent />
      </Suspense>
    </Page>
  );
}
