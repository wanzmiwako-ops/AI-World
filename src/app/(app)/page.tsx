import Link from "next/link";
import { Suspense } from "react";
import { CatPair, Heart } from "@/components/cat";
import { CountUp } from "@/components/count-up";
import { Icon } from "@/components/icon";
import { Avatar, Bubbles, Page, PageSkeleton } from "@/components/ui";
import { CopyCode } from "@/app/(app)/akun/account-forms";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { computeLoveMeter } from "@/lib/love-meter";
import { dayKey, daysBetween, formatDay, formatShort, formatTime } from "@/lib/dates";
import { ideaOfTheDay } from "@/lib/ideas";
import { signedUrls } from "@/lib/storage";
import type { Meeting, Photo } from "@/lib/types";

async function Dashboard() {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const coupleId = viewer.couple.id;
  const now = new Date();

  const [nextRes, love, openIssues, unread, photosRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, place, starts_at")
      .eq("couple_id", coupleId)
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    computeLoveMeter(supabase, coupleId, viewer.userId),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("couple_id", coupleId).neq("status", "resolved"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", coupleId)
      .neq("sender_id", viewer.userId)
      .is("read_at", null),
    supabase.from("photos").select("id, storage_path, created_at").eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(4),
  ]);

  const next = nextRes.data as Pick<Meeting, "id" | "title" | "place" | "starts_at"> | null;
  const photos = (photosRes.data ?? []) as Pick<Photo, "id" | "storage_path" | "created_at">[];
  const urls = await signedUrls(supabase, photos.map((p) => p.storage_path));
  const days = Math.max(0, daysBetween(viewer.couple.anniversary ?? viewer.couple.created_at, now));
  const daysToNext = next ? daysBetween(now, next.starts_at) : null;
  const idea = ideaOfTheDay(dayKey(now));
  const partnerName = viewer.partner?.display_name ?? "pasanganmu";

  return (
    <>
      <header className="flex animate-rise items-center justify-between gap-3 pt-8 lg:pt-6">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted first-letter:uppercase">{formatDay(now)}</p>
          <h1 className="font-display text-[32px] leading-tight font-semibold lg:text-[38px]">
            Hai, {viewer.profile.display_name}
          </h1>
        </div>
        <Link href="/akun" aria-label="Buka akun" className="flex">
          <Avatar name={viewer.profile.display_name} url={viewer.profile.avatar_url} />
          {viewer.partner && (
            <Avatar name={viewer.partner.display_name} url={viewer.partner.avatar_url} tone="aqua" className="-ml-3" />
          )}
        </Link>
      </header>

      {!viewer.partner && (
        <section className="card flex animate-rise flex-col gap-3 bg-sand-soft p-5">
          <h2 className="font-display text-lg font-medium">Pasanganmu belum bergabung</h2>
          <p className="text-sm text-sand-ink">Kirim kode ini supaya dia bisa daftar dan tersambung ke ruang kalian.</p>
          <CopyCode code={viewer.couple.invite_code} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[30px] bg-ocean p-6 text-white lg:col-span-2">
          <span aria-hidden="true" className="absolute -top-12 -right-10 size-48 rounded-full bg-aqua/30" />
          <Bubbles />
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
            <CatPair size={72} />
          </div>
          <Link
            href="/kalender"
            className="relative self-start rounded-2xl bg-white/20 px-3.5 py-2 text-sm font-bold"
          >
            {next
              ? `${daysToNext === 0 ? "Ketemu hari ini" : `Ketemu lagi ${formatShort(next.starts_at)} · ${daysToNext} hari lagi`}`
              : "Belum ada jadwal ketemu, yuk atur!"}
          </Link>
          <Link href="/ketemu" className="btn relative bg-white text-ocean">
            <Icon name="pin" size={20} /> Check-in ketemu
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Link href="/love-meter" className="flex animate-rise flex-col gap-1 rounded-[26px] bg-aqua-soft p-5">
            <span className="flex items-center justify-between text-sm font-bold">
              Love Meter <Heart size={22} />
            </span>
            <span className="font-display text-[44px] leading-none font-semibold">{love.score}</span>
            <span className="text-[13px] text-ink-soft">{love.label}</span>
          </Link>
          <Link href="/ruang-bicara" className="flex animate-rise flex-col gap-1 rounded-[26px] bg-sand-soft p-5">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/chat" className="card flex animate-rise items-center gap-4 p-5">
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-tint text-ocean">
            <Icon name="chat" />
            {(unread.count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-white">
                {unread.count}
              </span>
            )}
          </span>
          <span className="flex flex-col">
            <span className="font-bold">Chat dengan {partnerName}</span>
            <span className="text-[13px] text-muted">
              {(unread.count ?? 0) > 0 ? `${unread.count} pesan belum dibaca` : "Kirim kabar manis hari ini"}
            </span>
          </span>
        </Link>

        <Link href="/ide" className="card flex animate-rise items-center gap-4 p-5">
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

        <Link href="/kalender" className="card flex animate-rise items-center gap-4 p-5">
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

      <section className="card flex animate-rise flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-medium">Kenangan terbaru</h2>
          <Link href="/galeri" className="text-sm font-bold text-ocean">Galeri</Link>
        </div>
        {photos.length ? (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={urls[p.storage_path]} alt="" className="aspect-square w-full rounded-2xl bg-tint object-cover" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Belum ada foto. Foto pertama kalian bisa diunggah dari Galeri atau saat Mode Ketemu.</p>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <Page>
      <Suspense fallback={<div className="pt-10"><PageSkeleton /></div>}>
        <Dashboard />
      </Suspense>
    </Page>
  );
}
