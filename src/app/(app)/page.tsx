import { StatusCard } from "@/components/status-card";
import { UnreadBadge, UnreadText } from "@/components/live/unread";
import { LiveRefresh } from "@/components/live/live-refresh";
import Link from "next/link";
import { Suspense } from "react";
import { Heart } from "@/components/cat";
import { CountUp } from "@/components/count-up";
import { Icon } from "@/components/icon";
import { AppBar, Avatar, Bubbles, Page, PageSkeleton, ThemeArt } from "@/components/ui";
import { PetCats } from "@/components/pet-cats";
import { LoveHeart, loveTier } from "@/components/love-heart";
import { SweetCard } from "@/components/sweet-card";
import { NudgeBar } from "@/components/nudge-bar";
import { PartnerStatus } from "@/components/partner-status";
import { Celebrate } from "@/components/celebrate";
import { CopyCode } from "@/app/(app)/akun/account-forms";
import { JoinCodeForm } from "@/components/join-code-form";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { computeLoveMeter, type LoveStats } from "@/lib/love-meter";
import { dayKey, daysBetween, formatDay, formatShort, formatTime } from "@/lib/dates";
import { ideaOfTheDay } from "@/lib/ideas";
import { GAMES } from "@/lib/games/catalog";
import { signedUrls } from "@/lib/storage";
import type { Meeting, Photo } from "@/lib/types";

type DashboardData = {
  next_meeting: Pick<Meeting, "id" | "title" | "place" | "starts_at"> | null;
  open_issues: number;
  unread: number;
  photos: Pick<Photo, "id" | "storage_path" | "thumb_path" | "created_at">[];
  love: LoveStats | null;
  nudges_today?: { mine: number; partner: number };
};

/** Foto terbaru dimuat terpisah, jadi sisa Beranda tidak menunggu foto. */
async function RecentPhotos({ photos }: { photos: DashboardData["photos"] }) {
  if (!photos.length) {
    return <p className="text-sm text-muted">Belum ada foto. Foto pertama kalian bisa diunggah dari Galeri atau saat Mode Ketemu.</p>;
  }
  const supabase = await createClient();
  const urls = await signedUrls(supabase, photos.map((p) => p.thumb_path ?? p.storage_path));
  return (
    <div className="grid grid-cols-4 gap-2">
      {photos.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.id}
          src={urls[p.thumb_path ?? p.storage_path]}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-2xl bg-tint object-cover"
        />
      ))}
    </div>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  // Data akun & isi Beranda diambil bersamaan (keamanan dijaga RLS di database).
  const [viewer, { data }] = await Promise.all([requireCouple(), supabase.rpc("dashboard_data")]);
  const d = (data ?? { next_meeting: null, open_issues: 0, unread: 0, photos: [], love: null }) as DashboardData;
  const now = new Date();

  const love = computeLoveMeter(d.love, viewer.userId, now);
  const next = d.next_meeting;
  const openIssues = { count: d.open_issues };
  const unread = { count: d.unread };
  const days = Math.max(0, daysBetween(viewer.couple.anniversary ?? viewer.couple.created_at, now));
  const daysToNext = next ? daysBetween(now, next.starts_at) : null;
  const idea = ideaOfTheDay(dayKey(now));
  const partnerName = viewer.partner?.display_name ?? "pasanganmu";
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(now));
  const greeting = hour < 4 ? "Selamat malam" : hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const anniv = viewer.couple.anniversary;
  const isAnniversary = Boolean(anniv && anniv.slice(5) === dayKey(now).slice(5) && days > 0);
  const milestone = days > 0 && days % 100 === 0;
  const greetEmoji = hour < 4 ? "🌙" : hour < 11 ? "🌤️" : hour < 15 ? "☀️" : hour < 18 ? "🌇" : "🌙";
  const nextMilestone = Math.ceil((days + 1) / 100) * 100;
  const milestonePct = Math.round(((days - (nextMilestone - 100)) / 100) * 100);
  const tier = loveTier(love.score);
  const special = isAnniversary ? `Happy anniversary! ${Math.round(days / 365)} tahun bersama` : milestone ? `Hari ke-${days}! Hari spesial kalian` : null;

  return (
    <>
      <AppBar>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[13px] text-muted first-letter:uppercase">{formatDay(now)}</p>
          <h1 className="truncate font-display text-[26px] leading-tight font-semibold lg:text-[38px]">
            {greeting}, {viewer.profile.display_name}{" "}
            <span aria-hidden="true" className="inline-block origin-[70%_70%]" style={{ animation: "wave-hand 2.8s ease-in-out infinite" }}>
              {greetEmoji}
            </span>
          </h1>
          {viewer.partner && <PartnerStatus name={viewer.partner.display_name} lastActive={viewer.partner.last_active_at} />}
        </div>
        <Link href="/akun" aria-label="Buka akun" className="tap flex shrink-0">
          <Avatar name={viewer.profile.display_name} url={viewer.profile.avatar_url} />
          {viewer.partner && (
            <Avatar name={viewer.partner.display_name} url={viewer.partner.avatar_url} tone="aqua" className="-ml-3" />
          )}
        </Link>
      </AppBar>

      {special && (
        <div className="flex animate-rise items-center gap-3 rounded-[22px] bg-pink-soft px-4 py-3 text-[15px] font-bold text-[#9b1c3a]">
          <Heart size={22} />
          {special}
          <Celebrate id={`${dayKey(now)}-${viewer.couple.id}`} />
        </div>
      )}

      {!viewer.partner && (
        <section className="card grid animate-rise gap-5 bg-sand-soft p-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium">Sambungkan dengan pasanganmu</h2>
            <p className="text-sm text-sand-ink">Kirim kode undanganmu ini ke dia…</p>
            <CopyCode code={viewer.couple.invite_code} />
          </div>
          <div className="flex flex-col gap-3 border-t border-sand pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            <p className="text-sm text-sand-ink">…atau kalau dia sudah punya kode sendiri, masukkan kodenya di sini.</p>
            <JoinCodeForm compact />
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="hero relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[30px] p-6 lg:col-span-2">
          <span aria-hidden="true" className="absolute -top-12 -right-10 size-48 rounded-full opacity-30" style={{ background: "var(--glow)" }} />
          <Bubbles />
          <ThemeArt className="right-[38%] -bottom-5 hidden opacity-25 sm:block" size={110} />
          <div className="relative flex items-end justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium opacity-90">
                {viewer.profile.display_name} &amp; {partnerName}
              </span>
              <span className="font-display text-[72px] leading-none font-semibold lg:text-[88px]">
                <CountUp value={days} />
              </span>
              <span className="text-base font-medium">hari bersama</span>
            </div>
            <PetCats size={72} />
          </div>
          <div className="relative flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-xs font-bold">
              <span>Menuju hari ke-{nextMilestone} 🎉</span>
              <span className="opacity-90">{nextMilestone - days} hari lagi</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="relative h-full rounded-full bg-white"
                style={{ width: `${Math.max(4, milestonePct)}%`, animation: "grow 1.4s cubic-bezier(.2,.8,.2,1) .3s both" }}
              >
                <span aria-hidden="true" className="absolute -top-[7px] -right-2 text-[15px] leading-none" style={{ animation: "beat 1.6s ease-in-out infinite" }}>
                  💗
                </span>
              </div>
            </div>
          </div>
          <StatusCard
            me={{
              id: viewer.userId,
              name: viewer.profile.display_name,
              avatar: viewer.profile.avatar_url,
              status: { text: viewer.profile.status_text ?? null, emoji: viewer.profile.status_emoji ?? null, at: viewer.profile.status_at ?? null },
            }}
            partner={
              viewer.partner
                ? {
                    id: viewer.partner.id,
                    name: viewer.partner.display_name,
                    avatar: viewer.partner.avatar_url,
                    status: { text: viewer.partner.status_text ?? null, emoji: viewer.partner.status_emoji ?? null, at: viewer.partner.status_at ?? null },
                  }
                : null
            }
          />
          <Link
            href="/kalender"
            className="tap relative self-start rounded-2xl bg-white/20 px-3.5 py-2 text-sm font-bold"
          >
            {next
              ? `${daysToNext === 0 ? "Ketemu hari ini" : `Ketemu lagi ${formatShort(next.starts_at)} · ${daysToNext} hari lagi`}`
              : "Belum ada jadwal ketemu, yuk atur!"}
          </Link>
          <Link href="/ketemu" className="btn tap relative bg-white text-ocean-dark">
            <Icon name="pin" size={20} /> Check-in ketemu
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Link href="/love-meter" className="tap relative flex animate-rise flex-col gap-1 overflow-hidden rounded-[26px] bg-aqua-soft p-5">
            <span className="text-sm font-bold">Love Meter</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-[44px] leading-none font-semibold">{love.score}</span>
              <span className="ml-auto -mr-1 shrink-0" style={{ animation: "beat 2.4s ease-in-out infinite" }}>
                <LoveHeart score={love.score} size={54} interactive={false} showNumber={false} />
              </span>
            </span>
            <span className="text-[13px] text-ink-soft">
              {tier.emoji} {tier.label}
            </span>
          </Link>
          <Link href="/ruang-bicara" className="tap flex animate-rise flex-col gap-1 rounded-[26px] bg-sand-soft p-5">
            <span className="flex items-center justify-between text-sm font-bold">
              Ruang Bicara
              <span style={{ animation: "wiggle 2.6s ease-in-out infinite" }}>
                <Icon name="talk" size={22} />
              </span>
            </span>
            <span className="font-display text-[44px] leading-none font-semibold">{openIssues.count ?? 0}</span>
            <span className="text-[13px] text-sand-ink">topik perlu dibahas</span>
          </Link>
        </div>
      </div>

      {viewer.partner && <NudgeBar partnerName={partnerName} mine={d.nudges_today?.mine ?? 0} theirs={d.nudges_today?.partner ?? 0} />}

      {viewer.partner && <SweetCard partnerName={partnerName} seed={days} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/chat" className="card tap flex animate-rise items-center gap-4 p-5">
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-tint text-ocean">
            <Icon name="chat" />
            <UnreadBadge initial={unread.count ?? 0} />
          </span>
          <span className="flex flex-col">
            <span className="font-bold">Chat dengan {partnerName}</span>
            <span className="text-[13px] text-muted">
              <UnreadText initial={unread.count ?? 0} />
            </span>
          </span>
        </Link>

        <Link href="/ide" className="card tap flex animate-rise items-center gap-4 p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sand" style={{ animation: "wiggle 3s ease-in-out infinite" }}>
            <Icon name="sparkle" />
          </span>
          <span className="flex flex-col">
            <span className="font-bold">{idea.title}</span>
            <span className="text-[13px] text-muted">
              Ide hari ini · {idea.tempat} ruangan · {idea.dur}
            </span>
          </span>
        </Link>

        <Link href="/kalender" className="card tap flex animate-rise items-center gap-4 p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-aqua-soft text-aqua-ink">
            <Icon name="calendar" />
          </span>
          <span className="flex flex-col">
            <span className="font-bold">{next ? next.title : "Atur jadwal ketemu"}</span>
            <span className="text-[13px] text-muted">
              {next ? `${formatShort(next.starts_at)} · ${formatTime(next.starts_at)}${next.place ? ` · ${next.place}` : ""}` : "Biar ada yang ditunggu"}
            </span>
          </span>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/main" className="tap relative flex animate-rise items-center gap-4 overflow-hidden rounded-[26px] bg-pink-soft p-5 lg:col-span-2">
          <span className="flex shrink-0 -space-x-2 text-[30px]" aria-hidden="true">
            {GAMES.slice(0, 3).map((g, i) => (
              <span key={g.kind} className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-soft" style={{ animation: `bob ${2.6 + i * 0.4}s ease-in-out ${i * 0.2}s infinite` }}>
                {g.emoji}
              </span>
            ))}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-lg font-semibold">Main bareng {partnerName}</span>
            <span className="text-[13px] text-ink-soft">TTS, UNO Kucing, Kita Sehati?, XO, Kartu Ngobrol</span>
          </span>
          <span className="ml-auto hidden shrink-0 sm:block"><Icon name="next" /></span>
        </Link>
        <Link href="/tema" className="hero tap relative flex animate-rise items-center gap-4 overflow-hidden rounded-[26px] p-5">
          <span aria-hidden="true" className="theme-art text-[40px] leading-none" style={{ animation: "wiggle 3s ease-in-out infinite" }} />
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-bold tracking-wide uppercase opacity-80">Tema dunia</span>
            <span className="theme-name font-display text-lg font-semibold" />
          </span>
          <span className="ml-auto shrink-0"><Icon name="palette" /></span>
        </Link>
      </div>

      <section className="card flex animate-rise flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-medium">Kenangan terbaru</h2>
          <Link href="/galeri" className="text-sm font-bold text-ocean">Galeri</Link>
        </div>
        <Suspense fallback={<div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-tint" />)}</div>}>
          <RecentPhotos photos={d.photos} />
        </Suspense>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <Page>
      <LiveRefresh kinds={["meeting", "meeting_deleted", "photo", "issue", "issue_response", "issue_resolved", "mood"]} />
      <Suspense fallback={<div className="pt-[max(calc(env(safe-area-inset-top)+16px),24px)]"><PageSkeleton /></div>}>
        <Dashboard />
      </Suspense>
    </Page>
  );
}
