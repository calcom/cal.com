import { _generateMetadata } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description")
  );

const Page = () => <LegacyPage isAppDir={true} />;
export default Page;
