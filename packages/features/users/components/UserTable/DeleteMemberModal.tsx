import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Dialog, ConfirmationDialogContent, showToast } from "@calcom/ui";

import { RemovedMembersRedirectModal } from "./RemovedMembersRedirectModal";
import type { State, Action, User } from "./UserListTable";

export function DeleteMemberModal({
  state,
  dispatch,
  allUsers,
}: {
  allUsers: User[];
  state: State;
  dispatch: Dispatch<Action>;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess() {
      // We don't need to wait for invalidate to finish
      Promise.all([
        utils.viewer.teams.get.invalidate(),
        utils.viewer.eventTypes.invalidate(),
        utils.viewer.organizations.listMembers.invalidate(),
      ]);
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });
  const [profileRedirect, setProfileRedirect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ label: string | null; value: number } | undefined>();
  return (
    <Dialog
      open={state.deleteMember.showModal}
      onOpenChange={(open) =>
        !open &&
        dispatch({
          type: "CLOSE_MODAL",
        })
      }>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_member")}
        confirmBtnText={t("confirm_remove_member")}
        onConfirm={() => {
          // Shouldnt ever happen just for type safety
          if (!session?.user.org?.id || !state?.deleteMember?.user?.id) return;

          removeMemberMutation.mutate({
            teamIds: [session?.user.org.id],
            memberIds: [state?.deleteMember?.user.id],
            isOrg: true,
            redirectTo: selectedMember?.value,
          });
        }}>
        {t("remove_member_confirmation_message")}
        {state?.deleteMember?.user?.id && (
          <RemovedMembersRedirectModal
            profileRedirect={profileRedirect}
            setProfileRedirect={setProfileRedirect}
            selectedMember={selectedMember}
            setSelectedMember={setSelectedMember}
            usersToBeRemoved={[state?.deleteMember?.user.id]}
            allUsers={allUsers}
          />
        )}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
