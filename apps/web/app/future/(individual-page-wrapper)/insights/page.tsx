import OldPage from "@pages/insights/index";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

async function getData() {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return notFound();
  }

  return {};
}

const Page = async () => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  await getData();

  return (
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <OldPage />
    </PageWrapper>
  );
};

export default Page;
