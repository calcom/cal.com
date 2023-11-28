import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import type { Action } from "./UserListTable";

interface Props {
  dispatch: Dispatch<Action>;
}

export function InviteMemberModal(props: Props) {
  const { data: session } = useSession();
  const utils = trpc.useContext();
  const { t, i18n } = useLocale();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      props.dispatch({ type: "CLOSE_MODAL" });
      // Need to figure out if invalidating here is the right approach - we could have already
      // loaded a bunch of data and idk how pagination works with invalidation. We may need to use
      // Optimistic updates here instead.
      await utils.viewer.organizations.listMembers.invalidate();

      if (Array.isArray(data.usernameOrEmail)) {
        showToast(
          t("email_invite_team_bulk", {
            userCount: data.usernameOrEmail.length,
          }),
          "success"
        );
      } else {
        showToast(
          t("email_invite_team", {
            email: data.usernameOrEmail,
          }),
          "success"
        );
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (!session?.user.org?.id) return null;

  const orgId = session.user.org.id;

  return (
    <MemberInvitationModal
      members={[]}
      isOpen={true}
      onExit={() => {
        props.dispatch({
          type: "CLOSE_MODAL",
        });
      }}
      teamId={orgId}
      isOrg={true}
      justEmailInvites={!!orgId}
      isLoading={inviteMemberMutation.isLoading}
      onSubmit={(values) => {
        inviteMemberMutation.mutate({
          teamId: orgId,
          language: i18n.language,
          role: values.role,
          usernameOrEmail: values.emailOrUsername,
          isOrg: true,
        });
      }}
    />
  );
}
