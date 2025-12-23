import { _generateMetadata } from "app/_utils";

import TeamFeaturesView from "~/settings/teams/[id]/features-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/features`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <TeamFeaturesView teamId={Number(id)} />;
};

export default Page;
