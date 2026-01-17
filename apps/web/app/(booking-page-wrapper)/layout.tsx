import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export default async function BookingPageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? undefined;

  return (
    <div className="font-inter">
      <PageWrapper isBookingPage={true} requiresLicense={false} nonce={nonce}>
        {children}
      </PageWrapper>
    </div>
  );
}
