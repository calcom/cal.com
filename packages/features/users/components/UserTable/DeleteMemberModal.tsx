import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Dialog, ConfirmationDialogContent, showToast } from "@calcom/ui";

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
  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess() {
      // @ts-expect-error rows can't be of type never[] but oldData can be due to the filter
      utils.viewer.organizations.listMembers.setInfiniteData({ limit: 10, searchTerm: "" }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((member) => member.id !== state.deleteMember.user?.id),
          })),
        };
      });

      // Existing invalidations
      Promise.all([utils.viewer.teams.get.invalidate(), utils.viewer.eventTypes.invalidate()]);

      showToast(t("success"), "success");

      // Close the modal after successful deletion
      dispatch({ type: "CLOSE_MODAL" });
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
            teamIds: [session?.user.org.id],
            memberIds: [state?.deleteMember?.user.id],
            isOrg: true,
          });
        }}>
        {t("remove_member_confirmation_message")}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
