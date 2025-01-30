import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import { IconSprites } from "@calcom/ui";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "UI Playground",
  description: "A playground for Cal.com UI components",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
        <IconSprites />
      </body>
    </html>
  );
}
