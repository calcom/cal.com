import { useState } from "react";

import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

import TeamInviteListItem from "./TeamInviteListItem";

interface Props {
  teams: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logo?: string | null;
    bio?: string | null;
    hideBranding?: boolean | undefined;
    role: MembershipRole;
    accepted: boolean;
  }[];
}

export default function TeamInviteList(props: Props) {
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
    <div>
      <ul className="bg-default divide-subtle mb-8 divide-y rounded">
        {props.teams.map((team) => (
          <TeamInviteListItem
            key={team?.id as number}
            team={team}
            onActionSelect={(action: string) => selectAction(action, team?.id as number)}
            isLoading={deleteTeamMutation.isLoading}
            hideDropdown={hideDropdown}
            setHideDropdown={setHideDropdown}
          />
        ))}
      </ul>
    </div>
  );
}
