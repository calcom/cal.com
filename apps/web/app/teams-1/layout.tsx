import { headers } from "next/headers";
import { type ReactElement } from "react";

// default layout
import { getLayout } from "@calcom/features/MainLayout";

import PageWrapper from "@components/PageWrapperAppDir";

type LayoutProps = {
  children: ReactElement;
};

export default function Layout({ children }: LayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper
      getLayout={getLayout}
      requiresLicense={false}
      pageProps={children?.props}
      nonce={nonce}
      themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
