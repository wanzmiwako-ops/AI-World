"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { notifyPartner } from "@/lib/push";
import { requireCouple } from "@/lib/dal";
import type { ActionState } from "@/lib/types";

const CATEGORIES = ["Komunikasi", "Waktu", "Keuangan", "Keluarga", "Lainnya"];

export async function createIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCouple();
  const title = String(formData.get("title") ?? "").trim();
  const feeling = String(formData.get("feeling") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "Lainnya");
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : "Lainnya";
  if (!title) return { error: "Tulis topiknya dulu, ya." };
  if (title.length > 200 || feeling.length > 4000) return { error: "Tulisannya terlalu panjang." };

  const supabase = await createClient();
  const { error } = await supabase.from("issues").insert({
    couple_id: viewer.couple.id,
    created_by: viewer.userId,
    title,
    category,
    feeling: feeling || null,
  });
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: `${viewer.profile.display_name} ingin ngobrol`,
      body: `"${title}" · Tulis sisi ceritamu di Ruang Bicara`,
      url: "/ruang-bicara",
      tag: "issue",
    }),
  );
  refresh();
  return { ok: true, message: "Terkirim. Pasanganmu akan diminta menulis sisi ceritanya." };
}

export async function respondIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCouple();
  const issueId = String(formData.get("issue_id") ?? "");
  const feeling = String(formData.get("feeling") ?? "").trim();
  if (!feeling) return { error: "Tulis apa yang kamu rasakan dulu." };
  if (feeling.length > 4000) return { error: "Tulisannya terlalu panjang." };
  const supabase = await createClient();
  const { error } = await supabase.from("issue_responses").insert({ issue_id: issueId, feeling });
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: `${viewer.profile.display_name} sudah menulis sisi ceritanya`,
      body: "Yuk baca dan sepakati langkah bareng.",
      url: "/ruang-bicara",
      tag: "issue",
    }),
  );
  refresh();
  return { ok: true };
}

export async function resolveIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCouple();
  const issueId = String(formData.get("issue_id") ?? "");
  const agreement = String(formData.get("agreement") ?? "").trim();
  if (!agreement) return { error: "Tulis kesepakatan kalian dulu." };
  if (agreement.length > 2000) return { error: "Tulisannya terlalu panjang." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ agreement, status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", issueId);
  if (error) return { error: error.message };
  after(() =>
    notifyPartner(supabase, {
      title: "Kalian sudah sepakat ✨",
      body: `${viewer.profile.display_name}: ${agreement}`,
      url: "/ruang-bicara",
      tag: "issue",
    }),
  );
  refresh();
  return { ok: true };
}
