import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";
import { Team } from "@lib/types/team";

import TeamListItem from "./TeamListItem";

export default function TeamList(props: { teams: Team[] }) {
  const utils = trpc.useContext();

  function selectAction(action: string, team: Team) {
    switch (action) {
      case "disband":
        deleteTeam(team.id);
        break;
    }
  }

  const deleteTeamMutation = trpc.useMutation("viewer.teams.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.list"]);
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <div>
      <ul className="mb-2 bg-white border divide-y rounded divide-neutral-200">
        {props.teams.map((team: Team) => (
          <TeamListItem
            key={team.id}
            team={team}
            onActionSelect={(action: string) => selectAction(action, team)}></TeamListItem>
        ))}
      </ul>
    </div>
  );
}
