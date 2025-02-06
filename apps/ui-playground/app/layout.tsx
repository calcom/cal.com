import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export const metadata: Metadata = {
  title: "UI Playground",
  description: "A playground for Cal.com UI components",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} ${calFont.variable} bg-default font-[family-name:var(--font-inter)] antialiased`}>
        <TooltipProvider>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
