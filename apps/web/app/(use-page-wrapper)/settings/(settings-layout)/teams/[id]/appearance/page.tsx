import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamAppearanceView from "@calid/features/modules/teams/settings/TeamAppearanceView";

import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const teamId = (await params).id;

  return await _generateMetadata(
    (t) => `${t("team_appearance")}`,
    (t) => `${t("team_appearance_description")}`,
    undefined,
    undefined,
    `/settings/teams/${teamId}/appearance`
  );
};

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
