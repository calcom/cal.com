import { useState } from "react";

import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
}

export default function TeamList(props: Props) {
  const utils = trpc.useContext();

  const [hideDropdown, setHideDropdown] = useState(false);

  function selectAction(action: string, teamId: number) {
    switch (action) {
      case "disband":
        deleteTeam(teamId);
        break;
    }
  }

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <ul className="mb-2 divide-y divide-neutral-200 rounded border bg-white">
      {props.teams.map((team) => (
        <TeamListItem
          key={team?.id as number}
          team={team}
          onActionSelect={(action: string) => selectAction(action, team?.id as number)}
          isLoading={deleteTeamMutation.isLoading}
          hideDropdown={hideDropdown}
          setHideDropdown={setHideDropdown}
        />
      ))}
    </ul>
  );
}
