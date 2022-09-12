import { useState } from "react";

import { MembershipRole } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/v2";

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
      <ul className="mb-8 divide-y divide-neutral-200 rounded bg-white">
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
