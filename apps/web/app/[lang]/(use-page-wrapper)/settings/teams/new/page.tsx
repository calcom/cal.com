import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import CreateNewTeamView, { LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("create_new_team"), t("create_new_team_description"));
};

const ServerPage = async ({ params }: PageProps) => {
  return (
    <LayoutWrapper>
      <CreateNewTeamView />
    </LayoutWrapper>
  );
};

export default ServerPage;
