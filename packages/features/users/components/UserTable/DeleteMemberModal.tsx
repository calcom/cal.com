import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { PasswordConfirmationDialogContent } from "@calcom/features/components/PasswordConfirmationDialogContent";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import type { UserTableAction, UserTableState } from "./types";

export function DeleteMemberModal({
  state,
  dispatch,
}: {
  state: UserTableState;
  dispatch: Dispatch<UserTableAction>;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const { data: currentUser } = trpc.viewer.me.get.useQuery();
  const isCALIdentityProvider = currentUser?.identityProvider === IdentityProvider.CAL;

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess() {
      utils.viewer.organizations.listMembers.invalidate();
      utils.viewer.teams.get.invalidate();
      utils.viewer.eventTypes.invalidate();

      showToast(t("success"), "success");

      // Close the modal after successful deletion
      dispatch({ type: "CLOSE_MODAL" });
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const handleConfirm = () => {
    // Shouldn't ever happen just for type safety
    if (!session?.user.org?.id || !state?.deleteMember?.user?.id) return;

    removeMemberMutation.mutate({
      teamIds: [session?.user.org.id],
      memberIds: [state?.deleteMember?.user.id],
      isOrg: true,
    });
  };

  return (
    <Dialog
      open={state.deleteMember.showModal}
      onOpenChange={(open) =>
        !open &&
        dispatch({
          type: "CLOSE_MODAL",
        })
      }>
      {isCALIdentityProvider ? (
        <PasswordConfirmationDialogContent
          variety="danger"
          title={t("remove_member")}
          confirmBtnText={t("confirm_remove_member")}
          isPending={removeMemberMutation.isPending}
          onConfirm={handleConfirm}>
          {t("remove_member_confirmation_message")}
        </PasswordConfirmationDialogContent>
      ) : (
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_member")}
          confirmBtnText={t("confirm_remove_member")}
          isPending={removeMemberMutation.isPending}
          onConfirm={handleConfirm}>
          {t("remove_member_confirmation_message")}
        </ConfirmationDialogContent>
      )}
    </Dialog>
  );
}
