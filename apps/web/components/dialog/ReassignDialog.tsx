import type { Dispatch, SetStateAction } from "react";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, showToast } from "@calcom/ui";

type ReassignDialog = {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  teamId: number;
  bookingId: number;
};

export const ReassignDialog = ({ isOpenDialog, setIsOpenDialog, teamId, bookingId }: ReassignDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const roundRobinReassignMutation = trpc.viewer.teams.roundRobinReassign.useMutation({
    onSuccess: async () => {
      await utils.viewer.bookings.get.invalidate();
      setIsOpenDialog(false);
      showToast(t("booking_reassigned"), "success");
    },
    onError: async (error) => {
      if (error.message.includes(ErrorCode.NoAvailableUsersFound)) {
        showToast(t("no_available_hosts"), "error");
      } else {
        showToast(t("unexpected_error_try_again"), "error");
      }
    },
  });

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setIsOpenDialog(open);
      }}>
      <DialogContent title={t("reassign_round_robin_host")} description={t("reassign_to_another_rr_host")}>
        {/* TODO add team member reassignment*/}
        <DialogFooter>
          <DialogClose />
          <Button
            data-testid="rejection-confirm"
            loading={roundRobinReassignMutation.isPending}
            onClick={() => {
              roundRobinReassignMutation.mutate({ teamId, bookingId });
            }}>
            {t("reassign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
