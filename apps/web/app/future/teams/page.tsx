import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/teams/getServerSideProps";

import type { PageProps } from "~/teams/teams-view";
import Page from "~/teams/teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

export default WithLayout({
  getData: withAppDirSsr<PageProps>(getServerSideProps),
  getLayout: null,
  Page,
})<"P">;
