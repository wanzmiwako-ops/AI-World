import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: {
    default: "A&I WORLD",
    template: "%s · A&I WORLD",
  },
  description: "Dunia kecil untuk kita berdua: jadwal ketemu, Love Meter, chat, galeri, dan ide kencan.",
  applicationName: "A&I WORLD",
  appleWebApp: {
    capable: true,
    title: "A&I WORLD",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A6EBD",
  width: "device-width",
  initialScale: 1,
  // Tampilan terkunci seperti aplikasi: tidak ter-zoom/tergeser tanpa sengaja
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Tema terakhir dipasang sebelum halaman tampil, jadi warna tidak berkedip */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
