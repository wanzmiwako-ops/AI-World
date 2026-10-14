"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Logo } from "@/components/logo";
import { CatPair } from "@/components/cat";
import { SideRail } from "@/components/side-rail";
import { ThemeBackdrop } from "@/components/theme-backdrop";
import { useLive } from "@/lib/live";
import { haptic } from "@/lib/feel";

type NavItem = { href: string; label: string; icon: IconName };

const SIDEBAR: NavItem[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/chat", label: "Chat", icon: "chat" },
  { href: "/kalender", label: "Kalender", icon: "calendar" },
  { href: "/ketemu", label: "Mode Ketemu", icon: "pin" },
  { href: "/love-meter", label: "Love Meter", icon: "heart" },
  { href: "/ide", label: "Ide Kencan", icon: "sparkle" },
  { href: "/ruang-bicara", label: "Ruang Bicara", icon: "talk" },
  { href: "/galeri", label: "Galeri", icon: "image" },
  { href: "/main", label: "Main Bareng", icon: "game" },
  { href: "/tema", label: "Tema", icon: "palette" },
  { href: "/akun", label: "Akun", icon: "user" },
];

const BOTTOM: NavItem[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/kalender", label: "Kalender", icon: "calendar" },
  { href: "/ketemu", label: "Ketemu", icon: "pin" },
  { href: "/galeri", label: "Galeri", icon: "image" },
  { href: "/chat", label: "Chat", icon: "chat" },
];

/** Ikon menu yang langsung bereaksi saat diketuk, sebelum halaman selesai dimuat. */
function NavIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const { pending } = useLinkStatus();
  return (
    <span className={`inline-flex transition-transform duration-150 ${pending ? "scale-90 opacity-60" : ""}`} style={pending ? { animation: "bob 0.6s ease-in-out infinite" } : undefined}>
      <Icon name={name} size={size} />
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-pink px-1 text-[10px] leading-none font-bold text-white ${className}`}
      style={{ animation: "pop-in .3s cubic-bezier(.2,.9,.3,1.4) both" }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  const unread = useLive((s) => s.unread);
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-1">
      {SIDEBAR.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors ${
              active ? "bg-tint font-bold text-ocean" : "font-medium text-ink-soft hover:bg-sky"
            }`}
          >
            <NavIcon name={item.icon} size={20} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/chat" && <Badge count={unread} />}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const unread = useLive((s) => s.unread);
  const tap = () => haptic(8);
  if (pathname.startsWith("/chat")) return null;
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center rounded-t-[28px] bg-white pt-2 shadow-[0_-6px_24px_rgba(11,37,69,0.08)] select-none lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)", transform: "translateZ(0)" }}
    >
      {BOTTOM.map((item) => {
        const active = isActive(pathname, item.href);
        if (item.href === "/ketemu") {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={tap}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold ${active ? "text-ocean" : "text-navy"}`}
            >
              <span className="-mt-8 flex size-[60px] items-center justify-center rounded-full border-[5px] border-sky bg-ocean text-white shadow-ocean transition-transform active:scale-90">
                <NavIcon name="pin" size={26} />
              </span>
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={tap}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${active ? "font-bold text-ocean" : "font-medium text-muted"}`}
          >
            <span className={`relative flex h-[30px] w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${active ? "bg-tint" : ""}`}>
              <NavIcon name={item.icon} size={22} />
              {item.href === "/chat" && <Badge count={unread} className="absolute -top-1 right-1" />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bagian yang butuh alamat halaman: dibungkus Suspense supaya halaman dinamis (/main/[id]) tetap bisa di-prerender. */
function WithPath({ render }: { render: (pathname: string) => ReactNode }) {
  return render(usePathname());
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh lg:flex">
      <ThemeBackdrop />
      {/* Sidebar untuk PC */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-white px-4 py-7 select-none lg:flex">
        <Link href="/" className="px-3">
          <Logo size={38} textClass="text-[22px]" />
        </Link>
        <Suspense fallback={<SideNav pathname="" />}>
          <WithPath render={(p) => <SideNav pathname={p} />} />
        </Suspense>
        <Link href="/tema" className="hero tap relative mt-auto flex flex-col gap-1 overflow-hidden rounded-[24px] p-4">
          <span aria-hidden="true" className="theme-art absolute -top-1 right-2 text-[44px] leading-none" style={{ animation: "bob 4s ease-in-out infinite" }} />
          <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">Dunia kita</span>
          <span className="theme-name font-display text-lg leading-tight font-semibold" />
          <span className="mt-2 self-start">
            <CatPair size={40} />
          </span>
        </Link>
      </aside>

      {/* Halaman layar penuh (chat) menandai dirinya dengan data-fullscreen: tanpa jarak menu bawah & panel kanan */}
      <main className="min-w-0 flex-1 pb-[calc(96px+env(safe-area-inset-bottom))] has-[[data-fullscreen]]:pb-0 lg:pb-12 lg:has-[[data-fullscreen]]:pb-0">{children}</main>

      {/* Panel kanan untuk layar PC lebar */}
      <aside className="side-rail sticky top-0 hidden h-svh w-[320px] shrink-0 overflow-y-auto py-8 pr-6 select-none 2xl:block" aria-label="Ringkasan">
        <SideRail />
      </aside>

      {/* Menu bawah untuk HP */}
      <Suspense fallback={null}>
        <WithPath render={(p) => <BottomNav pathname={p} />} />
      </Suspense>
    </div>
  );
}
