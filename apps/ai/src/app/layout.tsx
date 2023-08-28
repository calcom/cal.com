import localFont from "next/font/local";
import React from "react";

import "../styles/globals.css";

const calSansFont = localFont({
  src: "../../public/fonts/CalSans-SemiBold.ttf",
  variable: "--font-cal-sans",
});

export const metadata = {
  description: "Chat with your calendar.",
  title: "Cal AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${calSansFont.variable}`}>{children}</body>
    </html>
  );
}
