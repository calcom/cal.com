import LegacyPage from "@pages/settings/organizations/new/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { WizardLayoutAppDir } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description")
  );

const getPageProps = async (context: GetServerSidePropsContext) => {
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
    <WizardLayoutAppDir currentStep={1} maxSteps={5}>
      {page}
    </WizardLayoutAppDir>
  );
};

// @ts-expect-error getData arg
export default WithLayout({ getLayout: LayoutWrapper, Page: LegacyPage, getData: getPageProps });
