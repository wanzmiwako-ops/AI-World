import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { dayKey, hoursAgoIso } from "@/lib/dates";
import type { CheckinSession, Meeting } from "@/lib/types";
import { CheckinView } from "./checkin-view";

export const metadata: Metadata = { title: "Mode Ketemu" };

type SessionRow = Pick<CheckinSession, "id" | "together_at" | "place"> & {
  checkin_participants: { user_id: string }[];
  photos: { count: number }[];
};

async function CheckinContent() {
  const supabase = await createClient();
  const since = hoursAgoIso(12);
  const today = dayKey();
  const dayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
  const dayEnd = new Date(new Date(dayStart).getTime() + 86_400_000).toISOString();

  // Sesi aktif + peserta + jumlah foto dalam satu query, paralel dengan data akun.
  const [viewer, sessionRes, planRes] = await Promise.all([
    requireCouple(),
    supabase
      .from("checkin_sessions")
      .select("id, together_at, place, checkin_participants(user_id), photos(count)")
      .is("ended_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("title, place")
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd)
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const row = sessionRes.data as SessionRow | null;
  const session = row ? { id: row.id, together_at: row.together_at, place: row.place } : null;
  const parts = row?.checkin_participants ?? [];
  const iAmIn = parts.some((p) => p.user_id === viewer.userId);
  const partnerIn = parts.some((p) => p.user_id !== viewer.userId);
  const photos = row?.photos?.[0]?.count ?? 0;

  return (
    <CheckinView
      coupleId={viewer.couple.id}
      me={{ id: viewer.userId, name: viewer.profile.display_name, avatar: viewer.profile.avatar_url }}
      partner={viewer.partner ? { id: viewer.partner.id, name: viewer.partner.display_name, avatar: viewer.partner.avatar_url } : null}
      session={session}
      iAmIn={iAmIn}
      partnerIn={partnerIn}
      plan={(planRes.data as Pick<Meeting, "title" | "place"> | null) ?? null}
      initialPhotos={photos}
    />
  );
}

export default function KetemuPage() {
  return (
    <Page>
      <PageHeader title="Mode Ketemu" subtitle="Check-in berdua saat kalian bertemu" />
      <Suspense fallback={<PageSkeleton />}>
        <CheckinContent />
      </Suspense>
    </Page>
  );
}
