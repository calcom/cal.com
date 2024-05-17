import { useState } from "react";

import { trackFormbricksAction } from "@calcom/lib/formbricks-client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

import OtherTeamListItem from "./OtherTeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["organizations"]["listOtherTeams"];
  pending?: boolean;
}

export default function OtherTeamList(props: Props) {
  const utils = trpc.useUtils();

  const [hideDropdown, setHideDropdown] = useState(false);

  function selectAction(action: string, teamId: number) {
    switch (action) {
      case "disband":
        deleteTeam(teamId);
        break;
    }
  }

  const deleteTeamMutation = trpc.viewer.organizations.deleteTeam.useMutation({
    async onSuccess() {
      await utils.viewer.organizations.listOtherTeams.invalidate();
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <ul className="bg-default divide-subtle border-subtle mb-2 divide-y overflow-hidden rounded-md border">
      {props.teams.map((team) => (
        <OtherTeamListItem
          key={team?.id as number}
          team={team}
          onActionSelect={(action: string) => selectAction(action, team?.id as number)}
          isPending={deleteTeamMutation.isPending}
          hideDropdown={hideDropdown}
          setHideDropdown={setHideDropdown}
        />
      ))}
    </ul>
  );
}
