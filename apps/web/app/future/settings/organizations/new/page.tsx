import LegacyPage, { WrappedCreateNewOrganizationPage } from "@pages/settings/organizations/new/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

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

export default WithLayout({
  getLayout: WrappedCreateNewOrganizationPage,
  Page: LegacyPage,
  getData: getPageProps,
});
