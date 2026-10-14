"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { formatShort, formatTime, jakartaLocalToIso } from "@/lib/dates";
import { after } from "next/server";
import { notifyPartner } from "@/lib/push";
import type { ActionState } from "@/lib/types";

export async function createMeeting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCouple();
  const title = String(formData.get("title") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const whenLocal = String(formData.get("starts_at") ?? "");
  if (!title) return { error: "Kasih nama rencananya, ya." };
  if (title.length > 200 || (place?.length ?? 0) > 200 || (note?.length ?? 0) > 2000) return { error: "Tulisannya terlalu panjang." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(whenLocal) || Number.isNaN(Date.parse(`${whenLocal.slice(0, 16)}:00+07:00`))) {
    return { error: "Pilih tanggal dan jam." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").insert({
    couple_id: viewer.couple.id,
    title,
    place,
    note,
    starts_at: jakartaLocalToIso(whenLocal),
    created_by: viewer.userId,
  });
  if (error) return { error: error.message };
  const when = new Date(jakartaLocalToIso(whenLocal));
  after(() =>
    notifyPartner(supabase, {
      title: `${viewer.profile.display_name} menambahkan jadwal`,
      body: `${title} · ${formatShort(when)}, ${formatTime(when)}`,
      url: "/kalender",
      tag: "meeting",
    }),
  );
  refresh();
  return { ok: true, message: "Jadwal tersimpan!" };
}

export async function deleteMeeting(id: string) {
  await requireCouple();
  const supabase = await createClient();
  await supabase.from("meetings").delete().eq("id", id);
  refresh();
}
