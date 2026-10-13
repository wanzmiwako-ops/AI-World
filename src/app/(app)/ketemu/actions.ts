"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { durationText } from "@/lib/dates";
import type { CheckinSession } from "@/lib/types";

export async function startCheckin(coords: { lat: number; lng: number } | null, place: string | null) {
  await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase.rpc("checkin", {
    p_place: place,
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export type CheckinSummary = {
  number: number;
  duration: string;
  photos: number;
  mood: string | null;
};

export async function finishCheckin(sessionId: string, mood: string | null, note: string | null) {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("end_checkin", { p_session: sessionId, p_mood: mood, p_note: note });
  if (error) return { error: error.message };

  const session = data as CheckinSession;
  const [{ count: number }, { count: photos }] = await Promise.all([
    supabase.from("checkin_sessions").select("id", { count: "exact", head: true }).eq("couple_id", viewer.couple.id).not("together_at", "is", null),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("checkin_session_id", sessionId),
  ]);
  const from = session.together_at ?? session.created_at;
  const summary: CheckinSummary = {
    number: number ?? 1,
    duration: durationText(new Date(session.ended_at ?? Date.now()).getTime() - new Date(from).getTime()),
    photos: photos ?? 0,
    mood: session.mood,
  };
  refresh();
  return { ok: true, summary };
}

export async function addCheckinPhoto(path: string, sessionId: string) {
  const viewer = await requireCouple();
  if (!path.startsWith(`${viewer.couple.id}/`)) return { error: "Lokasi foto tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    couple_id: viewer.couple.id,
    uploaded_by: viewer.userId,
    storage_path: path,
    checkin_session_id: sessionId,
    caption: "Foto dari Mode Ketemu",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function saveCheckinNote(sessionId: string, note: string) {
  await requireCouple();
  const supabase = await createClient();
  await supabase.from("checkin_sessions").update({ note }).eq("id", sessionId);
  return { ok: true };
}
