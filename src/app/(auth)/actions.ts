"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authErrorMessage, getSiteUrl } from "@/lib/site-url";
import type { ActionState } from "@/lib/types";

const notConfigured = { error: "Supabase belum disambungkan. Isi file .env.local dulu (lihat README)." };

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return notConfigured;
  const email = read(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Isi email dan kata sandi dulu." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error.message) };
  redirect("/");
}

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return notConfigured;
  const email = read(formData, "email");
  if (!email) return { error: "Isi email kamu dulu." };

  const supabase = await createClient();
  const site = await getSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/callback`, shouldCreateUser: false },
  });
  if (error) return { error: authErrorMessage(error.message) };
  return { ok: true, message: `Link masuk sudah dikirim ke ${email}. Buka dari HP atau laptop ini.` };
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return notConfigured;
  const name = read(formData, "name");
  const email = read(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Isi nama panggilan kamu." };
  if (!email) return { error: "Isi email kamu." };
  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };

  const supabase = await createClient();
  const site = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${site}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { error: authErrorMessage(error.message) };
  if (data.session) redirect("/onboarding");
  return { ok: true, message: `Hampir selesai! Buka email ${email} dan klik link konfirmasinya.` };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return notConfigured;
  const email = read(formData, "email");
  if (!email) return { error: "Isi email kamu dulu." };

  const supabase = await createClient();
  const site = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=/akun/password-baru`,
  });
  if (error) return { error: authErrorMessage(error.message) };
  return { ok: true, message: "Kalau email itu terdaftar, link untuk membuat kata sandi baru sudah dikirim." };
}
