// pages containing layout (e.g., /availability/[schedule].tsx) are supposed to go under (no-layout) folder
import { headers } from "next/headers";
import { type ReactElement } from "react";

import PageWrapper from "@components/PageWrapperAppDir";

type WrapperWithoutLayoutProps = {
  children: ReactElement;
};

export default async function WrapperWithoutLayout({ children }: WrapperWithoutLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
