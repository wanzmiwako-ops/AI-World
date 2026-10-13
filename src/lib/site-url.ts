import "server-only";
import { headers } from "next/headers";

/** URL dasar aplikasi untuk link di email (login, konfirmasi, reset password). */
export async function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function authErrorMessage(message?: string) {
  if (!message) return "Ada yang salah. Coba lagi, ya.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau kata sandi salah.";
  if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk kamu dulu.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email ini sudah terdaftar. Coba masuk.";
  if (m.includes("password should be") || m.includes("weak")) return "Kata sandi terlalu lemah. Pakai minimal 8 karakter.";
  if (m.includes("rate limit") || m.includes("too many")) return "Terlalu sering mencoba. Tunggu sebentar, lalu coba lagi.";
  if (m.includes("signups not allowed")) return "Email ini belum terdaftar. Daftar dulu, ya.";
  if (m.includes("same password") || m.includes("different from the old")) return "Kata sandi baru harus berbeda dari yang lama.";
  return message;
}
