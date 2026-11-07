import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NalarAI - Belajar aktif, naik level setiap hari",
    template: "%s | NalarAI",
  },
  description:
    "Platform belajar aktif bertenaga AI dengan pelajaran singkat, kuis interaktif, XP, streak, dan liga mingguan.",
  applicationName: "NalarAI",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "NalarAI",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "NalarAI",
    title: "NalarAI - Belajar aktif, naik level setiap hari",
    description: "Jalur belajar personal yang terasa seperti bermain, bukan menghafal.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Logo NalarAI" }],
  },
  twitter: {
    card: "summary",
    title: "NalarAI - Belajar aktif, naik level setiap hari",
    description: "Jalur belajar personal yang terasa seperti bermain, bukan menghafal.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#176BFF",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
