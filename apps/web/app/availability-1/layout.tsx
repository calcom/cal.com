import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayout";

import PageWrapper from "@components/PageWrapperAppDir";

type AvailabilityLayoutProps = {
  children: ReactElement;
};

export default async function AvailabilityLayout({ children }: AvailabilityLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    // @ts-expect-error withTrpc expects AppProps
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
