"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function createCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const anniversary = String(formData.get("anniversary") ?? "") || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_couple", { p_anniversary: anniversary });
  if (error) return { error: error.message };
  redirect("/");
}

export async function joinCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 6) return { error: "Kode undangan berisi 6 karakter." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_couple", { p_code: code });
  if (error) return { error: error.message };
  refresh();
  redirect("/");
}
