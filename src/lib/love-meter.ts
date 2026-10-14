import { dayKey } from "@/lib/dates";

/** Angka mentah dari fungsi database love_stats(). */
export type LoveStats = {
  meets: number;
  messages: number;
  moods: { mood: number; day: string; user_id: string }[];
  issues_total: number;
  issues_resolved: number;
};

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

const EMPTY: LoveStats = { meets: 0, messages: 0, moods: [], issues_total: 0, issues_resolved: 0 };

/**
 * Skor Love Meter dari aktivitas nyata kalian:
 * - Waktu berkualitas: berapa kali ketemu (check-in berdua) 30 hari terakhir
 * - Komunikasi: jumlah pesan chat 7 hari terakhir
 * - Mood: rata-rata mood harian berdua 7 hari terakhir
 * - Menyelesaikan masalah: persen topik Ruang Bicara yang selesai (90 hari)
 */
export function computeLoveMeter(raw: LoveStats | null, userId: string, now: Date = new Date()): LoveMeter {
  const s = raw ?? EMPTY;
  const today = dayKey(now);
  const moods = s.moods ?? [];

  const quality = clamp(20 + s.meets * 20);
  const communication = clamp(20 + s.messages * 1.2);
  const avgMood = moods.length ? moods.reduce((a, r) => a + r.mood, 0) / moods.length : 3.5;
  const mood = clamp(((avgMood - 1) / 4) * 100);
  const resolve = s.issues_total ? clamp((s.issues_resolved / s.issues_total) * 100) : 100;

  const parts = [
    { name: "Waktu berkualitas", value: quality, hint: `${s.meets}× ketemu dalam 30 hari` },
    { name: "Komunikasi", value: communication, hint: `${s.messages} pesan minggu ini` },
    { name: "Mood berdua", value: mood, hint: moods.length ? `rata-rata ${avgMood.toFixed(1)} dari 5` : "belum ada mood minggu ini" },
    {
      name: "Menyelesaikan masalah",
      value: resolve,
      hint: s.issues_total ? `${s.issues_resolved} dari ${s.issues_total} selesai` : "belum ada topik",
    },
  ];
  const score = clamp(parts.reduce((a, p) => a + p.value, 0) / parts.length);
  const label = score >= 80 ? "Super hangat" : score >= 60 ? "Hangat" : "Butuh perhatian";

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = dayKey(new Date(now.getTime() - (6 - i) * 86_400_000));
    const rows = moods.filter((r) => r.day === d);
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
    myMoodToday: moods.find((r) => r.user_id === userId && r.day === today)?.mood ?? null,
    partnerMoodToday: moods.find((r) => r.user_id !== userId && r.day === today)?.mood ?? null,
    week,
    tip: tips[lowest.name],
  };
}

export const MOOD_LABELS = ["", "Jauh", "Biasa", "Baik", "Dekat", "Lengket!"];
