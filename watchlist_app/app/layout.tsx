import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Watchlist",
  description: "A simple stock watchlist with live quotes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
