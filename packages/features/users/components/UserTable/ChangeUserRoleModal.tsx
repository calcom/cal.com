import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import MemberChangeRoleModal from "@calcom/features/ee/teams/components/MemberChangeRoleModal";

import type { Action, State } from "./UserListTable";

export function ChangeUserRoleModal(props: { state: State; dispatch: Dispatch<Action> }) {
  const { data: session } = useSession();
  const orgId = session?.user.org?.id;
  if (!orgId || !props.state.changeMemberRole.user) return null;

  return (
    <MemberChangeRoleModal
      isOpen={true}
      currentMember={props.state.changeMemberRole.user?.role}
      teamId={orgId}
      memberId={props.state.changeMemberRole.user?.id}
      initialRole={props.state.changeMemberRole.user?.role}
      onExit={() =>
        props.dispatch({
          type: "CLOSE_MODAL",
        })
      }
    />
  );
}
