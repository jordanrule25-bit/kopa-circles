import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kopa Circles", template: "%s · Kopa Circles" },
  description: "Lend $25 to self-formed borrower circles in Kenya. 0% interest to lenders.",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#121614" }, { color: "#f5f6f2" }] };
export const dynamic = "force-dynamic";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body-face" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
