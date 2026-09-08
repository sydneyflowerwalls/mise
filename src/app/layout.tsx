import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Varela_Round } from "next/font/google";

import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const varela = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varela",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "mise",
  description: "Family meal planning — recipes, weekly plan, shopping list, pantry.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "mise",
    // Matches the blush background so the status bar blends into the header.
    statusBarStyle: "default",
  },
  // Private household app — never index it, even behind Tailscale Funnel.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FFD1DC",
  width: "device-width",
  initialScale: 1,
  // viewportFit: "cover" is what makes env(safe-area-inset-*) return non-zero
  // on a home-screen iPhone app. Without it the bottom nav sits under the
  // home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${varela.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
