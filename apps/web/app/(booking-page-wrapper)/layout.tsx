import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

import { ssrInit } from "@server/lib/ssr";

export default async function BookingPageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const context = buildLegacyCtx(headers(), cookies(), {}, {});
  const ssr = await ssrInit(context);

  return (
    <PageWrapper
      isBookingPage={true}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      dehydratedState={ssr.dehydrate()}>
      {children}
    </PageWrapper>
  );
}
