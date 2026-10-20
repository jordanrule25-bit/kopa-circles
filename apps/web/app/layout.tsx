import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kopa Circles", template: "%s · Kopa Circles" },
  description: "Lend $25 to self-formed borrower circles in Kenya. 0% interest to lenders.",
  icons: { icon: "/app-icon/192", apple: "/app-icon/180" },
  appleWebApp: { capable: true, title: "Kopa", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#000000" }, { color: "#f5f5f7" }] };
export const dynamic = "force-dynamic";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
