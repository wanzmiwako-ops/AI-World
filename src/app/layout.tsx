import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

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
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
