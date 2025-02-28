import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("teams"), t("create_manage_teams_collaborative"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("teams")} description={t("create_manage_teams_collaborative")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
