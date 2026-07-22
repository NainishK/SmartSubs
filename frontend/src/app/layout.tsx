import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bingesensei.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BingeSensei - Smart OTT Subscription & Watchlist Manager",
    template: "%s | BingeSensei",
  },
  description: "Take control of your streaming budget. Auto-sync watchlists with active OTT subscriptions, receive renewal reminders, and get personalized AI recommendations.",
  keywords: [
    "subscription manager",
    "streaming tracker",
    "OTT subscription manager",
    "watchlist tracker",
    "Netflix cost tracker",
    "Prime Video watchlist",
    "renewal notifications",
    "streaming budget app",
    "BingeSensei"
  ],
  authors: [{ name: "BingeSensei Team" }],
  creator: "BingeSensei",
  publisher: "BingeSensei",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "BingeSensei",
    title: "BingeSensei - Smart OTT Subscription & Watchlist Manager",
    description: "Track renewal dates, calculate monthly spend, and match your watchlist with content available on your active subscriptions.",
    images: [
      {
        url: "/screenshots/subscriptions.png",
        width: 1200,
        height: 630,
        alt: "BingeSensei Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BingeSensei - Smart OTT Subscription & Watchlist Manager",
    description: "Track renewal dates, calculate monthly spend, and match your watchlist with content available on your active subscriptions.",
    images: ["/screenshots/subscriptions.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    title: "BingeSensei",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BingeSensei",
  "operatingSystem": "Web, iOS, Android",
  "applicationCategory": "FinanceApplication, EntertainmentApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Smart subscription tracking and watchlist organizer that matches content with your active streaming services and alerts you before upcoming renewals.",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "128"
  }
};

import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieBanner from "@/components/CookieBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="bingesensei-theme">
          <GoogleAnalytics />
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
