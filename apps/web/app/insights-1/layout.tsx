import { headers } from "next/headers";
import { type ReactElement } from "react";

import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

import PageWrapper from "@components/PageWrapperAppDir";

type InsightsLayoutProps = {
  children: ReactElement;
};

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};

export default async function InsightsLayout({ children }: InsightsLayoutProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const props = await getServerSideProps();

  return (
    // @ts-expect-error withTrpc expects AppProps
    <PageWrapper
      getLayout={getLayout}
      requiresLicense={false}
      pageProps={props}
      nonce={nonce}
      themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
