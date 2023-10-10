import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayout";

import PageWrapper from "@components/PageWrapperAppDir";

import { serverClient } from "../_trpc/serverClient";

type EventTypesLayoutProps = {
  children: ReactElement;
};

export default async function EventTypesLayout({ children }: EventTypesLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const x = await serverClient.testing.greeting();
  console.log(x);
  return (
    // @ts-expect-error withTrpc expects AppProps
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
