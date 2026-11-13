import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { RegisterServiceWorker } from "@/components/offline";
import { Shell } from "@/components/shell";
import "./globals.css";

// Fraunces for display: warm, variable, with a "soft" axis that gives it a
// hand-drawn feel without tipping into novelty. IBM Plex Sans for body: humanist
// and crafted, pairs with Fraunces and keeps long reads comfortable.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
  display: "swap",
  style: ["normal", "italic"],
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Kopa Circles", template: "%s · Kopa Circles" },
  description: "Lend $25 to self-formed borrower circles in Kenya. 0% interest to lenders.",
  icons: { icon: "/app-icon/192", apple: "/app-icon/180" },
  appleWebApp: { capable: true, title: "Kopa", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#141217" }, { color: "#faf5ec" }] };
export const dynamic = "force-dynamic";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plex.variable}`}>
      <body className="min-h-screen antialiased">
        <Shell>{children}</Shell>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
