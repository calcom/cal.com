import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayout";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

import PageWrapper from "@components/PageWrapperAppDir";

type EventTypesLayoutProps = {
  children: ReactElement;
};

const caller = viewerRouter.createCaller({});

export default async function EventTypesLayout({ children }: EventTypesLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  console.log(caller);
  const x = await caller.greeting();
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
