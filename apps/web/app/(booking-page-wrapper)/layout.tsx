import { headers } from "next/headers";

import { withPrismaPage } from "@calcom/prisma/store/withPrismaPage";

import PageWrapper from "@components/PageWrapperAppDir";

async function BookingPageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <>
      <PageWrapper isBookingPage={true} requiresLicense={false} nonce={nonce}>
        {children}
      </PageWrapper>
    </>
  );
}

export default withPrismaPage(BookingPageWrapperLayout);
