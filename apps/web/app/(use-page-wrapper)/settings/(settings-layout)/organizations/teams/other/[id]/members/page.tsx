import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage, {
  TeamMembersCTA,
} from "@calcom/features/ee/organizations/pages/settings/other-team-members-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("team_members")}
      description={t("members_team_description")}
      CTA={<TeamMembersCTA />}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
