import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, Icon } from "@calcom/ui";
import { showToast } from "@calcom/ui";

interface IDeleteHistoryDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
}

const DeleteHistoryDialog = (props: IDeleteHistoryDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const utils = trpc.useUtils();

  const deleteHistoryBookingMutation = trpc.viewer.bookings.deleteHistory.useMutation({
    onSuccess: async () => {
      showToast(t("booking_delete_successfully"), "success");
      setIsOpenDialog(false);
      utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      const message = `${err.data?.code}: ${t(err.message)}`;
      showToast(message || t("unable_to_delete_booking"), "error");
    },
  });

  const handleDelete = () => {
    deleteHistoryBookingMutation.mutate({ id: bookingId });
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
            <Icon name="trash" className="m-auto h-6 w-6" />
          </div>
          <div className="w-full pt-1">
            <DialogHeader title={t("delete_history_title")} />
            <p className="text-sm font-normal">{t("delete_history_description")}</p>
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsOpenDialog(false);
                }}
                type="button"
                color="secondary">
                {t("cancel")}
              </Button>
              <Button
                data-testid="delete_history"
                loading={deleteHistoryBookingMutation.isPending}
                onClick={handleDelete}>
                {t("confirm_delete_event_type")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteHistoryDialog;
