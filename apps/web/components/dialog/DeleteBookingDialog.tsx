import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";

interface DeleteBookingDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
}

export const DeleteBookingDialog = (props: DeleteBookingDialogProps) => {
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.bookings.delete.useMutation({
    onSuccess: async () => {
      setIsOpenDialog(false);
      await utils.viewer.bookings.invalidate();
    },
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
            <Icon name="trash" className="m-auto h-6 w-6" />
          </div>
          <div className="w-full pt-1">
            <DialogHeader title={t("delete")} />
            <p className="text-subtle text-sm">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
          </div>
        </div>
        <DialogFooter showDivider className="mt-8">
          <Button type="button" color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            color="destructive"
            onClick={() => deleteMutation.mutate({ bookingId })}
            disabled={deleteMutation.isPending}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteBookingDialog;
