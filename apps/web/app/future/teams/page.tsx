import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import { getServerSideProps } from "@lib/teams/getServerSideProps";

import Page from "@components/pages/teams";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

export default WithLayout({ getData: withAppDirSsr(getServerSideProps), getLayout, Page })<"P">;
