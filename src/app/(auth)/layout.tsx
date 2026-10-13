import type { ReactNode } from "react";
import { CatPair } from "@/components/cat";
import { Logo } from "@/components/logo";
import { Bubbles } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="relative flex shrink-0 flex-col overflow-hidden bg-ocean px-7 pt-[max(env(safe-area-inset-top),56px)] pb-20 text-white lg:w-1/2 lg:justify-between lg:px-16 lg:py-14">
        <span aria-hidden="true" className="absolute -top-16 -right-16 size-64 rounded-full bg-aqua/40" />
        <Bubbles />
        <div className="relative animate-rise">
          <Logo onDark size={44} textClass="text-[26px]" />
        </div>
        <span className="absolute top-[max(calc(env(safe-area-inset-top)+36px),48px)] right-5 lg:hidden">
          <CatPair size={60} />
        </span>
        <div className="relative mt-6 lg:mt-0 lg:flex lg:flex-col lg:gap-10">
          <h1 className="animate-rise font-display text-[38px] leading-[1.04] font-semibold lg:max-w-lg lg:text-[60px]">
            Dunia kecil
            <br />
            untuk kita berdua.
          </h1>
          <span className="hidden lg:block">
            <CatPair size={150} />
          </span>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 450 80"
          preserveAspectRatio="none"
          className="absolute -left-8 bottom-0 h-20 w-[calc(100%+64px)] lg:hidden"
        >
          <path d="M0 34 C 80 4 150 4 225 30 S 370 64 450 26 V80 H0 Z" fill="#7FDBEA" opacity="0.55" style={{ animation: "sway 6s ease-in-out infinite" }} />
          <path d="M0 56 C 90 26 160 34 230 56 S 370 82 450 52 V80 H0 Z" fill="#F2F8FC" />
        </svg>
      </section>

      <section className="flex flex-1 items-start justify-center px-7 pt-4 pb-12 lg:items-center lg:py-14">
        <div className="flex w-full max-w-[400px] flex-col gap-5">
          {!isSupabaseConfigured && (
            <p className="rounded-2xl bg-sand-soft px-4 py-3 text-sm font-semibold text-sand-ink">
              Supabase belum disambungkan. Salin <code>.env.example</code> menjadi <code>.env.local</code> lalu isi kuncinya.
            </p>
          )}
          {children}
        </div>
      </section>
    </div>
  );
}
