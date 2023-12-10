// pages without layout (e.g., /availability/index.tsx) are supposed to go under (layout) folder
import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import PageWrapper from "@components/PageWrapperAppDir";

type WrapperWithLayoutProps = {
  children: ReactElement;
};

export default async function WrapperWithLayout({ children }: WrapperWithLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
