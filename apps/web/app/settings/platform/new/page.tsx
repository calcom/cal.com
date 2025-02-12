import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import LegacyPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_platform_organization"),
    (t) => t("platform_organization_description")
  );
type Props = {
  isOrg: boolean;
};

export default WithLayout({
  getLayout: LayoutWrapper,
  Page: LegacyPage,
  getData: withAppDirSsr<Props>(getServerSideProps),
  requiresLicense: true,
});
