import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { dayKey, durationText, formatTime } from "@/lib/dates";
import type { CheckinSession, Meeting } from "@/lib/types";
import { CalendarView, type CalendarMeeting } from "./calendar-view";

export const metadata: Metadata = { title: "Kalender" };

async function CalendarContent({ searchParams }: { searchParams: PageProps<"/kalender">["searchParams"] }) {
  const [viewer, params] = await Promise.all([requireCouple(), searchParams]);
  const today = dayKey();
  const raw = typeof params.m === "string" && /^\d{4}-\d{2}$/.test(params.m) ? params.m : today.slice(0, 7);
  const [y, m] = raw.split("-").map(Number);

  // Rentang bulan dalam waktu Jakarta (UTC+7)
  const start = new Date(Date.UTC(y, m - 1, 1) - 7 * 3_600_000).toISOString();
  const end = new Date(Date.UTC(y, m, 1) - 7 * 3_600_000).toISOString();

  const supabase = await createClient();
  const [meetingsRes, sessionsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, place, note, starts_at")
      .eq("couple_id", viewer.couple.id)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at"),
    supabase
      .from("checkin_sessions")
      .select("meeting_id, together_at, ended_at")
      .eq("couple_id", viewer.couple.id)
      .not("meeting_id", "is", null)
      .not("together_at", "is", null),
  ]);

  const durations = new Map<string, string>();
  ((sessionsRes.data ?? []) as Pick<CheckinSession, "meeting_id" | "together_at" | "ended_at">[]).forEach((s) => {
    if (s.meeting_id && s.together_at && s.ended_at) {
      durations.set(s.meeting_id, durationText(new Date(s.ended_at).getTime() - new Date(s.together_at).getTime()));
    }
  });

  const meetings: CalendarMeeting[] = ((meetingsRes.data ?? []) as Meeting[]).map((mt) => {
    const day = dayKey(mt.starts_at);
    return {
      id: mt.id,
      title: mt.title,
      place: mt.place,
      note: mt.note,
      day,
      time: formatTime(mt.starts_at),
      past: day < today,
      together: durations.get(mt.id) ?? null,
    };
  });

  return <CalendarView key={raw} monthKey={raw} todayKey={today} meetings={meetings} />;
}

export default function KalenderPage(props: PageProps<"/kalender">) {
  return (
    <Page>
      <PageHeader title="Kalender" subtitle="Jadwal ketemu kalian berdua" />
      <Suspense fallback={<PageSkeleton />}>
        <CalendarContent searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}
