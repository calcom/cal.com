import { _generateMetadata } from "app/_utils";

import CreateTeamEventType, { LayoutWrapper } from "~/settings/teams/[id]/event-types-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("add_new_team_event_type"),
    (t) => t("new_event_type_to_book_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/event-type`
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <CreateTeamEventType />
    </LayoutWrapper>
  );
};

export default ServerPage;
