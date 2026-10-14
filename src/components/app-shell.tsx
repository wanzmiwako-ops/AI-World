"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Logo } from "@/components/logo";
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = pathname.startsWith("/chat");
  const unread = useLive((s) => s.unread);
  const tap = () => haptic(8);

  return (
    <div className="min-h-svh lg:flex">
      {/* Sidebar untuk PC */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-8 bg-white px-4 py-7 select-none lg:flex">
        <Link href="/" className="px-3">
          <Logo size={38} textClass="text-[22px]" />
        </Link>
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
      </aside>

      <main className={`min-w-0 flex-1 ${hideBottomNav ? "" : "pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-12"}`}>{children}</main>

      {/* Menu bawah untuk HP */}
      {!hideBottomNav && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center rounded-t-[28px] bg-white/95 pt-2 shadow-[0_-6px_24px_rgba(11,37,69,0.08)] backdrop-blur select-none lg:hidden"
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
      )}
    </div>
  );
}
