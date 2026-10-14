import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { dayKey, durationText, formatShort } from "@/lib/dates";
import { signedUrls } from "@/lib/storage";
import type { CheckinSession, Meeting, Photo } from "@/lib/types";
import { GalleryView, UploadButton, type Album, type GalleryPhoto } from "./gallery-view";

export const metadata: Metadata = { title: "Galeri" };

async function Upload() {
  const viewer = await requireCouple();
  return <UploadButton coupleId={viewer.couple.id} />;
}

async function GalleryContent() {
  const supabase = await createClient();
  // Semua diambil bersamaan; RLS di database memastikan hanya data ruang kalian.
  const [viewer, photosRes, meetingsRes, sessionsRes] = await Promise.all([
    requireCouple(),
    supabase
      .from("photos")
      .select("id, storage_path, thumb_path, caption, uploaded_by, created_at, checkin_session_id")
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.from("meetings").select("id, title, place, starts_at").order("starts_at", { ascending: false }).limit(200),
    supabase.from("checkin_sessions").select("id, together_at, ended_at, place").not("together_at", "is", null).order("created_at", { ascending: false }).limit(200),
  ]);

  const photos = (photosRes.data ?? []) as Photo[];
  // Grid cukup pakai thumbnail kecil; foto penuh baru dimuat saat dibuka.
  const urls = await signedUrls(supabase, photos.map((p) => p.thumb_path ?? p.storage_path));
  const names: Record<string, string> = { [viewer.userId]: "kamu" };
  if (viewer.partner) names[viewer.partner.id] = viewer.partner.display_name;

  const meetingByDay = new Map<string, Pick<Meeting, "title" | "place">>();
  ((meetingsRes.data ?? []) as Meeting[]).forEach((m) => meetingByDay.set(dayKey(m.starts_at), m));
  const sessions = new Map(((sessionsRes.data ?? []) as CheckinSession[]).map((s) => [s.id, s]));

  const toItem = (p: Photo): GalleryPhoto => ({
    id: p.id,
    url: urls[p.thumb_path ?? p.storage_path] ?? "",
    fullPath: p.storage_path,
    caption: p.caption,
    uploader: names[p.uploaded_by] ?? "pasangan",
  });

  const groups = new Map<string, Photo[]>();
  photos.forEach((p) => {
    const key = dayKey(p.created_at);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  });

  const albums: Album[] = [...groups.entries()].map(([key, list]) => {
    const meeting = meetingByDay.get(key);
    const session = list.map((p) => (p.checkin_session_id ? sessions.get(p.checkin_session_id) : undefined)).find(Boolean);
    const badge =
      session?.together_at && session.ended_at
        ? `Ketemu ${durationText(new Date(session.ended_at).getTime() - new Date(session.together_at).getTime())}`
        : null;
    return {
      key,
      title: meeting?.title ?? (session ? "Hari ketemuan" : "Kenangan"),
      meta: `${formatShort(`${key}T12:00:00+07:00`)} · ${list.length} foto${meeting?.place ? ` · ${meeting.place}` : ""}`,
      badge,
      photos: list.map(toItem),
    };
  });

  // Kenangan setahun lalu (hari & bulan yang sama)
  const today = dayKey();
  const lastYear = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  const throwback = groups.get(lastYear);

  return (
    <>
      {throwback && (
        <section className="flex animate-rise items-center gap-4 rounded-[26px] bg-sand-soft p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[throwback[0].thumb_path ?? throwback[0].storage_path]} alt="" className="size-[72px] -rotate-3 rounded-[20px] object-cover" style={{ animation: "wiggle 3s ease-in-out infinite" }} />
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-sand-ink">Setahun lalu hari ini</span>
            <span className="font-display text-lg font-medium">{meetingByDay.get(lastYear)?.title ?? "Kenangan kalian"}</span>
            <span className="text-[13px] text-[#4D4220]">{throwback.length} foto</span>
          </div>
        </section>
      )}
      <GalleryView albums={albums} all={photos.map(toItem)} />
    </>
  );
}

export default function GaleriPage() {
  return (
    <Page>
      <PageHeader
        title="Galeri"
        subtitle="Kenangan setiap pertemuan"
        right={
          <Suspense fallback={<span className="flex size-12 items-center justify-center rounded-full bg-ocean text-white"><Icon name="plus" /></span>}>
            <Upload />
          </Suspense>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <GalleryContent />
      </Suspense>
    </Page>
  );
}
