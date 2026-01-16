import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  preload: true,
  display: "swap",
});

export const fontHeading = localFont({
  src: "./CalSans-SemiBold.woff2",
  variable: "--font-heading",
  preload: true,
  display: "block",
  weight: "600",
});
