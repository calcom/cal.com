import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import MoveTeamToOrgView from "~/settings/admin/org-migrations/move-team-to-org-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_migration_move_team"),
    (t) => t("organization_migration_move_team_description"),
    undefined,
    undefined,
    "/settings/admin/migrations/move-team-to-org"
  );

const Page = async (): Promise<React.ReactNode> => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("organization_migration_move_team")}
      description={t("organization_migration_move_team_description")}>
      <MoveTeamToOrgView />
    </SettingsHeader>
  );
};

export default Page;
