import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { dayKey, hoursAgoIso } from "@/lib/dates";
import type { CheckinSession, Meeting } from "@/lib/types";
import { CheckinView } from "./checkin-view";

export const metadata: Metadata = { title: "Mode Ketemu" };

async function CheckinContent() {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const since = hoursAgoIso(12);
  const today = dayKey();
  const dayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
  const dayEnd = new Date(new Date(dayStart).getTime() + 86_400_000).toISOString();

  const [sessionRes, planRes] = await Promise.all([
    supabase
      .from("checkin_sessions")
      .select("id, together_at, place, created_at, ended_at")
      .eq("couple_id", viewer.couple.id)
      .is("ended_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("title, place")
      .eq("couple_id", viewer.couple.id)
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd)
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const session = sessionRes.data as Pick<CheckinSession, "id" | "together_at" | "place"> | null;
  let iAmIn = false;
  let partnerIn = false;
  let photos = 0;
  if (session) {
    const [{ data: parts }, { count }] = await Promise.all([
      supabase.from("checkin_participants").select("user_id").eq("session_id", session.id),
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("checkin_session_id", session.id),
    ]);
    iAmIn = Boolean(parts?.some((p) => p.user_id === viewer.userId));
    partnerIn = Boolean(parts?.some((p) => p.user_id !== viewer.userId));
    photos = count ?? 0;
  }

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
