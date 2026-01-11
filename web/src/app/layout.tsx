import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gaze - Next.js Development Monitor",
  description:
    "A terminal based interface for monitoring Next.js application errors with AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.className} antialiased dark`}>{children}</body>
    </html>
  );
}
