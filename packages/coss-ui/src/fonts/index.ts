import { Inter } from "next/font/google";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  preload: true,
  display: "swap",
});

export const fontHeading = Inter({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: "600",
  preload: true,
  display: "swap",
});
