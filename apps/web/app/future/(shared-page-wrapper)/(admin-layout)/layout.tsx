import { headers } from "next/headers";
import { type ReactElement } from "react";

import PageWrapper from "@components/PageWrapperAppDir";
import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

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
