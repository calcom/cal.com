import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamCustomBrandingView from "@calid/features/modules/teams/settings/TeamCustomBrandingView";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const teamId = (await params).id;

  return await _generateMetadata(
    (t) => `${t("custom_branding")}`,
    (t) => `${t("manage_custom_branding")}`,
    undefined,
    undefined,
    `/settings/teams/${teamId}/custom-branding`
  );
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamCustomBrandingView teamId={Number(teamId)} />
    </TeamEditLayout>
  );
};

export default Page;
