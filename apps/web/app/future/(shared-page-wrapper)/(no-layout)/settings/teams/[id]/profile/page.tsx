import Page from "@pages/settings/teams/[id]/profile";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description")
  );

export default Page;
