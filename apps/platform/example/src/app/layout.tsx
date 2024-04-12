import "~/styles/globals.css";

import { AxiomWebVitals } from "next-axiom";
import { cn } from "~/lib/utils";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { TailwindIndicator } from "./tailwind-indicator";
import { Providers } from "./providers";
import { Metadata } from "next";

const interFont = Inter({ subsets: ["latin"], variable: "--font-inter", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export const metadata: Metadata = {
  title: {
    default: "Cal.com Platform: Showcase App",
    template: `Cal.com Platform | %s`,
  },
  description:
    "Cal.com Platform example app: Showcase usage of the 'Cal Atoms' React Components",
  keywords: ["cal.com", "platform", "example", "app", "scheduling software", "scheduling components", "scheduling react"],
  authors: [
    {
      name: "Richard Poelderl",
      url: "https://x.com/richardpoelderl",
    },
    {name: "Peer Richelsen", url: "https://x.com/peerrich"},
  ],
  creator: "Cal.com",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <AxiomWebVitals />
      <body
        className={cn(
          "antialiased",
          calFont.variable,
          interFont.variable,
        )}
      >
        <Providers defaultTheme="system" enableSystem attribute="class">
          <div className="flex min-h-screen flex-col">
            {/* Omitting header, so that the search page is Google-style */}
            <main>{children}</main>
          </div>
          <TailwindIndicator />
        </Providers>
        <Toaster />
      </body>
      <Analytics />
    </html>
  );
}
