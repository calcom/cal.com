import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/add-teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

export default WithLayout({
  requiresLicense: true,
  getLayout: LayoutWrapper,
  Page: LegacyPage,
  getData: withAppDirSsr(getServerSideProps),
});
