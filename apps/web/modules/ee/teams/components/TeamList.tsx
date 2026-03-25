import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { trackFormbricksAction } from "@calcom/web/modules/formbricks/lib/trackFormbricksAction";
import { useState } from "react";
import TeamListItem from "./TeamListItem";
import { UpgradeToOrgsBanner } from "./UpgradeToOrgsBanner";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  orgId: number | null;
  /**
   * True for teams that are pending invite acceptance
   */
  pending?: boolean;
}

export default function TeamList(props: Props) {
  const utils = trpc.useUtils();

  const { orgId } = props;

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
      revalidateTeamsList();
      await utils.viewer.teams.hasTeamPlan.invalidate();
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
    <>
      {!props.pending && !orgId && props.teams.length > 1 && <div className="hidden md:block"><UpgradeToOrgsBanner /></div>}
      <ul className="bg-default divide-subtle border-subtle mt-4 mb-2 divide-y overflow-hidden rounded-2xl border">
        {props.teams.map((team) => (
          <TeamListItem
            key={team?.id as number}
            team={team}
            orgId={orgId}
            onActionSelect={(action: string) => selectAction(action, team?.id as number)}
            isPending={deleteTeamMutation.isPending}
            hideDropdown={hideDropdown}
            setHideDropdown={setHideDropdown}
          />
        ))}
      </ul>
    </>
  );
}
