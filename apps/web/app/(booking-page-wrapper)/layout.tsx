import { Inter } from "next/font/google";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans", preload: true, display: "swap" });

export default async function BookingPageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? undefined;

  return (
    <div className={fontSans.variable} style={{ fontFamily: fontSans.style.fontFamily }}>
      <PageWrapper isBookingPage={true} requiresLicense={false} nonce={nonce}>
        {children}
      </PageWrapper>
    </div>
  );
}
