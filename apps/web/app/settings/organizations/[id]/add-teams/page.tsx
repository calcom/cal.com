import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/add-teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getLayout: LayoutWrapper,
  getData,
});
