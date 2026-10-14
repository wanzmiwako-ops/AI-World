import "server-only";
import { cookies } from "next/headers";

/**
 * Token buka-kunci PIN disimpan di cookie httpOnly (tidak bisa dibaca JavaScript).
 * Masa berlakunya diatur di database dan diperpanjang selama aplikasi dipakai;
 * kalau aplikasi ditinggal lebih lama dari batas, PIN diminta lagi.
 */
export const UNLOCK_COOKIE = "aiw_unlock";

export async function readUnlockToken() {
  return (await cookies()).get(UNLOCK_COOKIE)?.value ?? null;
}

export async function setUnlockToken(token: string | null) {
  const store = await cookies();
  if (!token) {
    store.delete(UNLOCK_COOKIE);
    return;
  }
  store.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

/** Hanya izinkan kembali ke alamat di dalam aplikasi ini. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/kunci")) return "/";
  return next;
}
