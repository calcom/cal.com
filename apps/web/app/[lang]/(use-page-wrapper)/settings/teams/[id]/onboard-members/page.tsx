import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import AddNewTeamMembers, { LayoutWrapper } from "~/settings/teams/[id]/onboard-members-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("add_team_members"), t("add_team_members_description"));
};

const ServerPage = async ({ params }: PageProps) => {
  return (
    <LayoutWrapper>
      <AddNewTeamMembers />
    </LayoutWrapper>
  );
};

export default ServerPage;
