import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Dialog, ConfirmationDialogContent, showToast } from "@calcom/ui";

import type { State, Action } from "./UserListTable";

export function DeleteMemberModal({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useContext();
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
            teamId: session?.user.org.id,
            memberId: state?.deleteMember?.user.id,
            isOrg: true,
          });
        }}>
        {t("remove_member_confirmation_message")}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
