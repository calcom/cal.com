import OldPage from "@pages/settings/organizations/new/index";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { WizardLayout } from "@calcom/ui";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

type PageProps = Readonly<{
  params: Params;
}>;

const getData = async (context: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  // Check if organizations are enabled
  if (flags["organizations"] !== true) {
    return notFound();
  }

  const querySlug = context.query.slug as string;

  return {
    querySlug: querySlug ?? null,
  };
};

const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

const Page = async ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  const props = await getData(legacyCtx);

  return (
    <PageWrapper getLayout={LayoutWrapper} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <OldPage {...props} />
    </PageWrapper>
  );
};

export default Page;
