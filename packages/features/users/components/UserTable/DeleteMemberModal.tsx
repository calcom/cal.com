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
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();
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
          if (!session?.user.organizationId || !state?.deleteMember?.user?.id) return;

          removeMemberMutation.mutate({
            teamId: session?.user.organizationId,
            memberId: state?.deleteMember?.user.id,
            isOrg: true,
          });
        }}>
        {t("remove_member_confirmation_message")}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
