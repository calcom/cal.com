import CreateTeamWrapper from "@calid/features/modules/teams/components/CreateTeamWrapper";
import CreateTeamEvent from "@calid/features/modules/teams/pages/CreateTeamEvent";
import { _generateMetadata } from "app/_utils";

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
    <CreateTeamWrapper>
      <CreateTeamEvent />
    </CreateTeamWrapper>
  );
};

export default ServerPage;
