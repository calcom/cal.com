import Page from "@pages/settings/teams/[id]/onboard-members";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

export default Page;
