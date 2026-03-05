import PageWrapper from "@components/PageWrapperAppDir";
import { headers } from "next/headers";
import { BookingPageRequestTracker } from "./BookingPageRequestTracker";

export default async function BookingPageWrapperLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? undefined;

  return (
    <>
      <BookingPageRequestTracker />
      <PageWrapper isBookingPage={true} requiresLicense={false} nonce={nonce}>
        {children}
      </PageWrapper>
    </>
  );
}
