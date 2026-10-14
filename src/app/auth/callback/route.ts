import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Tujuan semua link dari email Supabase:
 * konfirmasi daftar, magic link, dan reset kata sandi.
 * Mendukung format ?code= (PKCE) maupun ?token_hash=&type=.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\") ? nextParam : "/";

  const supabase = await createClient();
  let failed = true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
  const target = type === "recovery" ? "/akun/password-baru" : next;
  return NextResponse.redirect(`${origin}${target}`);
}
