import { _generateMetadata, getTranslate } from "app/_utils";
import { TeamEditLayout } from "@calid/features/teams/TeamEditLayout";

// import LegacyPage from "@calcom/features/ee/teams/pages/team-appearance-view";
import TeamAppearanceView from "@calid/features/teams/TeamAppearanceView";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/appearance`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamAppearanceView />
    </TeamEditLayout>
  );
};

export default Page;
