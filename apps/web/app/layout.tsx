import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import classNames from "@calcom/lib/classNames";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "",
  description: "",
};

const interFont = Inter({ subsets: ["latin"], variable: "--font-inter", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={classNames(interFont.variable, calFont.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
