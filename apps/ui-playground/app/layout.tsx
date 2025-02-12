import { TooltipProvider } from "@radix-ui/react-tooltip";
import { RootProvider } from "fumadocs-ui/provider";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";

import "./global.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${calFont.variable} bg-default font-[family-name:var(--font-inter)] antialiased`}>
        <RootProvider>
          <TooltipProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </TooltipProvider>
        </RootProvider>
      </body>
    </html>
  );
}
