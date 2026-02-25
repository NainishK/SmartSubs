import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartSubs | Master Your Digital Life",
  description: "Track, Manage, and Discover content across all your services.",
  appleWebApp: {
    title: "SmartSubs",
    statusBarStyle: "black-translucent",
    capable: true,
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Optional: prevents zooming on input focus on iOS
};

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="smartsubs-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
