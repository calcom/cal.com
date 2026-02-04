import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/ee/teams/views/team-appearance-view";

import { validateUserHasOrg } from "../../../../actions/validateUserHasOrg";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/organizations/teams/other/${(await params).id}/appearance`
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrg();

  return (
    <SettingsHeader
      title={t("booking_appearance")}
      description={t("appearance_team_description")}
      borderInShellHeader={false}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
