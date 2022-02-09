import showToast from "@lib/notification";
import { trpc, inferQueryOutput } from "@lib/trpc";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: inferQueryOutput<"viewer.teams.list">;
}

export default function TeamList(props: Props) {
  const utils = trpc.useContext();

  function selectAction(action: string, teamId: number) {
    switch (action) {
      case "disband":
        deleteTeam(teamId);
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
      <ul className="mb-2 divide-y divide-neutral-200 rounded border bg-white">
        {props.teams.map((team) => (
          <TeamListItem
            key={team?.id as number}
            team={team}
            onActionSelect={(action: string) => selectAction(action, team?.id as number)}></TeamListItem>
        ))}
      </ul>
    </div>
  );
}
