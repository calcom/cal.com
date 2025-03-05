import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui";
import { showToast } from "@calcom/ui";

interface IDeleteBookingDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
}

export const DeleteBookingDialog = (props: IDeleteBookingDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const utils = trpc.useUtils();

  const deleteBookingMutation = trpc.viewer.bookings.deleteBooking.useMutation({
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

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <ConfirmationDialogContent
        isPending={deleteBookingMutation.isPending}
        variety="danger"
        title={t("delete_booking_title")}
        confirmBtnText={t("confirm")}
        onConfirm={(e) => {
          e.preventDefault();
          deleteBookingMutation.mutate({ id: bookingId });
        }}>
        {t("delete_booking_description")}
      </ConfirmationDialogContent>
    </Dialog>
  );
};
