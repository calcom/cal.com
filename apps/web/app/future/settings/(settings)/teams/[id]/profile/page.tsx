import { _generateMetadata } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description")
  );

const Page = () => <LegacyPage isAppDir={true} />;
export default Page;
