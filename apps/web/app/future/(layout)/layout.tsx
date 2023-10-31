// pages without layout (e.g., /availability/index.tsx) are supposed to go under (layout) folder
import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import PageWrapper from "@components/PageWrapperAppDir";

type WrapperWithLayoutProps = {
  children: ReactElement;
};

const handleGetProps = async (children: ReactElement) => {
  const props = await import(`./${children.props.childProp.segment}/page.tsx`).then(
    (mod) => mod.getProps?.() ?? null
  );
  return props;
};

export default async function WrapperWithLayout({ children }: WrapperWithLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const props = await handleGetProps(children);

  return (
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      {children}
    </PageWrapper>
  );
}
