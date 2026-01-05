import { _generateMetadata, getTranslate } from "app/_utils";

import { TeamDetailView } from "@calcom/features/admin/teams/components/TeamDetailView";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_details"),
    (t) => t("admin_teams_description"),
    undefined,
    undefined,
    "/settings/admin/teams"
  );

const Page = async ({ params }: { params: { id: string } }) => {
  const t = await getTranslate();
  const teamId = parseInt(params.id, 10);

  return (
    <SettingsHeader
      title={t("team_details")}
      description={t("admin_teams_description")}
      borderInShellHeader={false}>
      <TeamDetailView teamId={teamId} />
    </SettingsHeader>
  );
};

export default Page;
