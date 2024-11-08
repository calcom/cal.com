import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";
import { type inferSSRProps } from "@lib/types/inferSSRProps";

import LegacyPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_platform_organization"),
    (t) => t("platform_organization_description")
  );

export default WithLayout({
  getLayout: LayoutWrapper,
  Page: LegacyPage,
  getData: withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps),
  requiresLicense: true,
});
