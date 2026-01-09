import type { Metadata } from "next";
import type { ReactElement } from "react";

import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import TeamFeaturesView from "~/settings/teams/[id]/features-view";

type PageParams = { params: Promise<{ id: string }> };

const generateMetadata = async ({ params }: PageParams): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/features`
  );

const Page = async ({ params }: PageParams): Promise<ReactElement> => {
  const { id } = await params;
  const teamId = Number(id);

  if (Number.isNaN(teamId)) {
    return notFound();
  }

  return <TeamFeaturesView teamId={teamId} />;
};

export { generateMetadata };
export default Page;
