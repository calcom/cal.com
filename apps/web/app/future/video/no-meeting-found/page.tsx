import LegacyPage from "@pages/video/no-meeting-found";
import { ssrInit } from "app/_trpc/ssrInit";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

export const getData = async () => {
  const ssr = await ssrInit();

  return {
    dehydratedState: await ssr.dehydrate(),
  };
};

export default async function Page() {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const props = await getData();
  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <LegacyPage />
    </PageWrapper>
  );
}
