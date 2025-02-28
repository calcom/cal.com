import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import CreateTeamEventType, { LayoutWrapper } from "~/settings/teams/[id]/event-types-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return await _generateMetadata(t("add_new_team_event_type"), t("new_event_type_to_book_description"));
};

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <CreateTeamEventType />
    </LayoutWrapper>
  );
};

export default ServerPage;
