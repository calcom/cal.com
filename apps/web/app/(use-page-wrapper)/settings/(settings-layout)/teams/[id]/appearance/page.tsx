import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamAppearanceView from "@calid/features/modules/teams/settings/TeamAppearanceView";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/appearance`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamAppearanceView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
