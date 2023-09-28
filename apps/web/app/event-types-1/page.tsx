import EventTypesPage from "@pages/event-types";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { getLayout } from "@calcom/features/MainLayout";
import { IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";

import PageWrapper from "@components/PageWrapperAppDir";

export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0",
  metadataBase: new URL(IS_CALCOM ? "https://cal.com" : WEBAPP_URL),
  alternates: {
    canonical: "/event-types",
  },
  twitter: {
    card: "summary_large_image",
    title: "@calcom",
  },
};

export default function EventTypesPageWrapped(props: Record<string, unknown>) {
  const h = headers();

  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper
      getLayout={getLayout}
      requiresLicense={false}
      pageProps={props}
      nonce={nonce}
      themeBasis={null}>
      <EventTypesPage />
    </PageWrapper>
  );
}
