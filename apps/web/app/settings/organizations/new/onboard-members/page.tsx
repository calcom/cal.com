import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("invite_organization_admins"),
    (t) => t("invite_organization_admins_description")
  );

export default WithLayout({
  requiresLicense: true,
  getLayout: LayoutWrapper,
  Page: LegacyPage,
  getData: withAppDirSsr(getServerSideProps),
});
