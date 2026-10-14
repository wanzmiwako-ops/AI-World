import type { Metadata } from "next";
import { Suspense } from "react";
import { Heart } from "@/components/cat";
import { TapHeart } from "@/components/celebrate";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { computeLoveMeter, type LoveStats } from "@/lib/love-meter";
import { MoodPicker } from "./mood-picker";

export const metadata: Metadata = { title: "Love Meter" };

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

async function LoveContent() {
  const supabase = await createClient();
  const [viewer, { data }] = await Promise.all([requireCouple(), supabase.rpc("love_stats")]);
  const love = computeLoveMeter(data as LoveStats | null, viewer.userId);
  const c = 2 * Math.PI * 88;
  const dash = `${((c * love.score) / 100).toFixed(1)} ${c.toFixed(1)}`;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card flex animate-rise flex-col items-center gap-3 p-6">
        <div className="relative size-[210px]">
          <svg width="210" height="210" viewBox="0 0 210 210" role="img" aria-label={`Skor ${love.score} dari 100`}>
            <circle cx="105" cy="105" r="88" fill="none" stroke="#E3F1FB" strokeWidth="18" />
            <circle
              cx="105"
              cy="105"
              r="88"
              fill="none"
              stroke="#0A6EBD"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={dash}
              transform="rotate(-90 105 105)"
              style={{ animation: "fillring 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <TapHeart className="rounded-full">
              <Heart size={26} />
            </TapHeart>
            <span className="font-display text-[60px] leading-none font-semibold">{love.score}</span>
            <span className="text-[15px] font-bold text-ocean">{love.label}</span>
          </div>
        </div>
        <p className="max-w-xs text-center text-[13px] text-muted">
          Dihitung dari seberapa sering kalian ketemu, chat, mood harian, dan masalah yang berhasil diselesaikan.
        </p>
      </section>

      <div className="flex flex-col gap-5">
        <MoodPicker mine={love.myMoodToday} partner={love.partnerMoodToday} partnerName={viewer.partner?.display_name ?? "Pasangan"} />

        <section className="card flex animate-rise flex-col gap-4 p-5">
          {love.parts.map((p, i) => (
            <div key={p.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="font-bold">{p.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF4F9]">
                <div
                  className={`h-2.5 rounded-full ${p.value < 60 ? "bg-[#F5B83D]" : "bg-ocean"}`}
                  style={{ width: `${p.value}%`, animation: `grow 1s cubic-bezier(.2,.8,.2,1) ${0.3 + i * 0.1}s both` }}
                />
              </div>
              <span className="text-xs text-muted">{p.hint}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card flex animate-rise flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-medium">Mood 7 hari terakhir</h2>
        <div className="grid h-28 grid-cols-7 items-end gap-2">
          {love.week.map((w, i) => (
            <div key={w.day} className="flex h-full flex-col items-center justify-end gap-1.5">
              <div
                className={`w-full max-w-7 rounded-lg ${i === 6 ? "bg-ocean" : "bg-[#B5DAF2]"}`}
                style={{ height: `${w.value ? 12 + (w.value / 5) * 68 : 6}px`, animation: `rise .5s ease ${i * 0.05}s both` }}
                title={w.value ? `${w.value.toFixed(1)} dari 5` : "belum ada"}
              />
              <span className="text-[11px] font-medium text-muted">{DAY_NAMES[new Date(`${w.day}T12:00:00+07:00`).getDay()]}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="animate-rise self-start rounded-[22px] bg-sand-soft px-4 py-3.5 text-sm text-[#3D3100]">
        <b>Tips:</b> {love.tip}
      </p>
    </div>
  );
}

export default function LoveMeterPage() {
  return (
    <Page>
      <PageHeader title="Love Meter" subtitle="Seberapa hangat kalian minggu ini" back="/" />
      <Suspense fallback={<PageSkeleton />}>
        <LoveContent />
      </Suspense>
    </Page>
  );
}
