import Page from "@pages/settings/teams/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

export default Page;
