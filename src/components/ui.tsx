import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

/** Lebar konten halaman: penuh di HP, lega di PC. */
export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 lg:px-10 ${className}`}
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)" }}
    >
      {children}
    </div>
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
    <header className="flex animate-rise items-center gap-3 pt-8 lg:pt-6">
      {back && (
        <Link
          href={back}
          aria-label="Kembali"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-navy lg:hidden"
        >
          <Icon name="back" size={20} />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="font-display text-[30px] leading-tight font-semibold lg:text-[36px]">{title}</h1>
        {subtitle && <div className="text-[15px] text-muted">{subtitle}</div>}
      </div>
      {right}
    </header>
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
        tone === "sand" ? "bg-sand" : "bg-[#A8E6F0]"
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

export function Bubbles({ className = "" }: { className?: string }) {
  const items = [
    { left: "10%", size: 12, dur: 6, delay: 0 },
    { left: "38%", size: 9, dur: 5, delay: 1.6 },
    { left: "62%", size: 15, dur: 7, delay: 3 },
    { left: "84%", size: 8, dur: 5.5, delay: 4.2 },
  ];
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-2 rounded-full border-2 border-white/70 opacity-0"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animation: `bubble ${b.dur}s linear ${b.delay}s infinite`,
          }}
        />
      ))}
    </span>
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
