import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dayKey } from "@/lib/dates";

export type LoveMeter = {
  score: number;
  label: string;
  parts: { name: string; value: number; hint: string }[];
  myMoodToday: number | null;
  partnerMoodToday: number | null;
  week: { day: string; value: number }[];
  tip: string;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Skor Love Meter dari aktivitas nyata kalian:
 * - Waktu berkualitas: berapa kali ketemu (check-in berdua) 30 hari terakhir
 * - Komunikasi: jumlah pesan chat 7 hari terakhir
 * - Mood: rata-rata mood harian berdua 7 hari terakhir
 * - Menyelesaikan masalah: persen topik Ruang Bicara yang selesai (90 hari)
 */
export async function computeLoveMeter(
  supabase: SupabaseClient,
  coupleId: string,
  userId: string,
): Promise<LoveMeter> {
  const now = Date.now();
  const since7 = new Date(now - 7 * 86_400_000).toISOString();
  const since30 = new Date(now - 30 * 86_400_000).toISOString();
  const since90 = new Date(now - 90 * 86_400_000).toISOString();
  const week0 = dayKey(new Date(now - 6 * 86_400_000));
  const today = dayKey();

  const [sessions, moods, msgCount, issues] = await Promise.all([
    supabase.from("checkin_sessions").select("id").eq("couple_id", coupleId).not("together_at", "is", null).gte("created_at", since30),
    supabase.from("mood_checkins").select("mood, day, user_id").eq("couple_id", coupleId).gte("day", week0),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("couple_id", coupleId).gte("created_at", since7),
    supabase.from("issues").select("status").eq("couple_id", coupleId).gte("created_at", since90),
  ]);

  const meetCount = sessions.data?.length ?? 0;
  const moodRows = (moods.data ?? []) as { mood: number; day: string; user_id: string }[];
  const messages = msgCount.count ?? 0;
  const issueRows = (issues.data ?? []) as { status: string }[];

  const quality = clamp(20 + meetCount * 20);
  const communication = clamp(20 + messages * 1.2);
  const avgMood = moodRows.length ? moodRows.reduce((a, r) => a + r.mood, 0) / moodRows.length : 3.5;
  const mood = clamp(((avgMood - 1) / 4) * 100);
  const resolve = issueRows.length
    ? clamp((issueRows.filter((i) => i.status === "resolved").length / issueRows.length) * 100)
    : 100;

  const parts = [
    { name: "Waktu berkualitas", value: quality, hint: `${meetCount}× ketemu dalam 30 hari` },
    { name: "Komunikasi", value: communication, hint: `${messages} pesan minggu ini` },
    { name: "Mood berdua", value: mood, hint: moodRows.length ? `rata-rata ${avgMood.toFixed(1)} dari 5` : "belum ada mood minggu ini" },
    { name: "Menyelesaikan masalah", value: resolve, hint: issueRows.length ? `${issueRows.filter((i) => i.status === "resolved").length} dari ${issueRows.length} selesai` : "belum ada topik" },
  ];
  const score = clamp(parts.reduce((a, p) => a + p.value, 0) / parts.length);
  const label = score >= 80 ? "Super hangat" : score >= 60 ? "Hangat" : "Butuh perhatian";

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = dayKey(new Date(now - (6 - i) * 86_400_000));
    const rows = moodRows.filter((r) => r.day === d);
    return { day: d, value: rows.length ? rows.reduce((a, r) => a + r.mood, 0) / rows.length : 0 };
  });

  const lowest = [...parts].sort((a, b) => a.value - b.value)[0];
  const tips: Record<string, string> = {
    "Waktu berkualitas": "Jadwalkan ketemu minggu ini dan jangan lupa check-in di Mode Ketemu.",
    Komunikasi: "Kirim voice note atau pesan manis pagi-pagi, kecil tapi berasa.",
    "Mood berdua": "Tanya kabar dengan tulus hari ini, lalu dengarkan sampai selesai.",
    "Menyelesaikan masalah": "Ada topik yang menggantung di Ruang Bicara. Coba sepakati satu langkah kecil.",
  };

  return {
    score,
    label,
    parts,
    myMoodToday: moodRows.find((r) => r.user_id === userId && r.day === today)?.mood ?? null,
    partnerMoodToday: moodRows.find((r) => r.user_id !== userId && r.day === today)?.mood ?? null,
    week,
    tip: tips[lowest.name],
  };
}

export const MOOD_LABELS = ["", "Jauh", "Biasa", "Baik", "Dekat", "Lengket!"];
