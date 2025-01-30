import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://cs162-attendance-tracker.vercel.app/"),
  openGraph: {
    title: "Attendance Tracker",
    description: "QR code based attendance tracking system",
    url: "https://cs162-attendance-tracker.vercel.app/",
    siteName: "CS 162 Attendance",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://cs162-attendance-tracker.vercel.app/og.png",
        width: 3024,
        height: 1890,
        alt: "CS 162 Attendance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Attendance Tracker",
    description: "QR code based attendance tracking system",
    images: ["https://cs162-attendance-tracker.vercel.app/og.png"],
  },
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
