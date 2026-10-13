"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { dayKey } from "@/lib/dates";

export async function setMood(mood: number) {
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) return { error: "Mood tidak valid." };
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase
    .from("mood_checkins")
    .upsert(
      { couple_id: viewer.couple.id, user_id: viewer.userId, day: dayKey(), mood },
      { onConflict: "user_id,day" },
    );
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
