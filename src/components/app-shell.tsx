"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Logo } from "@/components/logo";

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

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = pathname.startsWith("/chat");

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar untuk PC */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 bg-white px-4 py-7 lg:flex">
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
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className={`min-w-0 flex-1 ${hideBottomNav ? "" : "pb-32 lg:pb-12"}`}>{children}</main>

      {/* Menu bawah untuk HP */}
      {!hideBottomNav && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center rounded-t-[28px] bg-white pt-2 shadow-[0_-6px_24px_rgba(11,37,69,0.06)] lg:hidden"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          {BOTTOM.map((item) => {
            const active = isActive(pathname, item.href);
            if (item.href === "/ketemu") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 text-[11px] font-bold ${active ? "text-ocean" : "text-navy"}`}
                >
                  <span className="-mt-8 flex size-[60px] items-center justify-center rounded-full border-[5px] border-sky bg-ocean text-white shadow-ocean">
                    <Icon name="pin" size={26} />
                  </span>
                  {item.label}
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 text-[11px] ${active ? "font-bold text-ocean" : "font-medium text-muted"}`}
              >
                <span className={`flex h-[30px] w-12 items-center justify-center rounded-full ${active ? "bg-tint" : ""}`}>
                  <Icon name={item.icon} size={22} />
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
