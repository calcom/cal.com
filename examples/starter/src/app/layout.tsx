import "~/styles/globals.css";

import { AxiomWebVitals } from "next-axiom";
import { cn } from "~/lib/utils";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { TailwindIndicator } from "./tailwind-indicator";
import { Providers } from "./providers";
import { type Metadata } from "next";
/**
 * [@calcom] In your root layout, make sure you import the atoms' global styles so that you get our shiny styles
 * @link https://cal.com/docs/platform/quick-start#5.3-setup-root-of-your-app
 */
import "@calcom/atoms/globals.min.css";
import { currentUser } from "~/auth";


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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /** [@calcom] Fetch the user so that we can add the user's accessToken to the <CalProvider /> */
  const user = await currentUser();
  
  return (
    /** [@calcom] Ensure to set the diretion (either 'ltr' or 'rtl') since the calcom/atoms use their styles */
    <html lang="en" dir="ltr">
      <head />
      <AxiomWebVitals />
      <body
        className={cn(
          "antialiased",
          calFont.variable,
          interFont.variable,
        )}
      >
        <Providers defaultTheme="system" enableSystem attribute="class" calUserToken={user?.calAccount?.accessToken}>
          <div className="flex min-h-screen flex-col">
            {/* Omitting header, so that the search page is Google-style */}
           {children}
          </div>
          <TailwindIndicator />
        </Providers>
        <Toaster />
      </body>
      <Analytics />
    </html>
  );
}
