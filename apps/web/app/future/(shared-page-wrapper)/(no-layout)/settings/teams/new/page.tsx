import Page from "@pages/settings/teams/new/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description")
  );

export default Page;
