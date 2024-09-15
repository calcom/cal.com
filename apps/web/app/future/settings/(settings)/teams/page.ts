import { _generateMetadata } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

  const Page = () => <LegacyPage isAppDir={true} />;
  export default Page;
  