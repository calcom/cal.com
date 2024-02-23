import Page from "@pages/teams/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/teams/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

export default WithLayout({ getData: withAppDirSsr(getServerSideProps), getLayout: null, Page })<"P">;
