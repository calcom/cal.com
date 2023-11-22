import Page from "@pages/settings/teams/[id]/members";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description")
  );

export default Page;
