import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage, {
  TeamMembersCTA,
} from "@calcom/features/ee/organizations/pages/settings/other-team-members-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("team_members"), t("members_team_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

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
