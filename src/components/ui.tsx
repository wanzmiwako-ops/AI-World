import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * Lebar konten halaman: penuh di HP, lega di PC. Pindah halaman memudar halus (CSS biasa,
 * bukan View Transitions: lebih ringan & tidak membuat layar "membeku" di WebView Android).
 */
export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`page-in mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-5 lg:gap-5 lg:px-10 2xl:px-8 ${className}`}>{children}</div>
  );
}

/** Bilah judul yang menempel di atas saat halaman digulir (seperti aplikasi native). */
export function AppBar({ children }: { children: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-sky/95 px-4 pb-3 sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-8"
      style={{ paddingTop: "max(calc(env(safe-area-inset-top) + 10px), 18px)" }}
    >
      {children}
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <AppBar>
      {back && (
        <Link
          href={back}
          aria-label="Kembali"
          className="tap flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-soft lg:hidden"
        >
          <Icon name="back" size={20} />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate font-display text-[26px] leading-tight font-semibold lg:text-[36px]">{title}</h1>
        {subtitle && <div className="truncate text-sm text-muted lg:text-[15px]">{subtitle}</div>}
      </div>
      {right}
    </AppBar>
  );
}

export function Avatar({
  name,
  url,
  size = 42,
  tone = "sand",
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: number;
  tone?: "sand" | "aqua";
  className?: string;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-sky font-display font-semibold ${
        tone === "sand" ? "bg-sand" : "bg-aqua"
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[26px] bg-white/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-40" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-24" />
    </div>
  );
}

/** Hiasan melayang di kartu berwarna: gelembung (Samudra) atau hiasan khas tema lain. */
export function Bubbles({ className = "" }: { className?: string }) {
  const items = [
    { left: "8%", size: 12, dur: 6, delay: 0 },
    { left: "30%", size: 9, dur: 5, delay: 1.6 },
    { left: "52%", size: 15, dur: 7, delay: 3 },
    { left: "70%", size: 10, dur: 6.5, delay: 0.8 },
    { left: "86%", size: 8, dur: 5.5, delay: 4.2 },
    { left: "42%", size: 11, dur: 6, delay: 2.4 },
  ];
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((b, i) => (
        <span
          key={i}
          className="deco"
          style={
            {
              left: b.left,
              width: b.size,
              height: b.size,
              "--s": `${b.size}px`,
              animation: `bubble ${b.dur}s linear ${b.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Gambar besar khas tema di pojok kartu hero. */
export function ThemeArt({ className = "", size = 120 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`theme-art pointer-events-none absolute leading-none select-none ${className}`}
      style={{ fontSize: size, animation: "bob 4s ease-in-out infinite" }}
    />
  );
}

export function FormMessage({ state }: { state?: { error?: string; message?: string } }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
        state.error ? "bg-pink-soft text-[#9b1c3a]" : "bg-aqua-soft text-aqua-ink"
      }`}
    >
      {state.error ?? state.message}
    </p>
  );
}
