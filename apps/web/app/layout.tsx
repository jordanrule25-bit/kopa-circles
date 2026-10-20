import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kopa Circles",
  description: "Lend $25 to self-formed borrower circles in Kenya. 0% interest to lenders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
