import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, showToast } from "@calcom/ui";

interface DeletePastBookingsSectionProps {
  bookingsCount: number;
  bookingIds: number[];
}

export const DeletePastBookingsSection = ({ bookingsCount, bookingIds }: DeletePastBookingsSectionProps) => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const deletePastBookingsMutation = trpc.viewer.bookings.deletePastBookings.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      utils.viewer.bookings.get.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeletePastBookings = () => {
    deletePastBookingsMutation.mutate({ bookingIds });
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        className="mb-4"
        color="destructive"
        onClick={() => setIsDialogOpen(true)}
        disabled={deletePastBookingsMutation.status === "pending"}>
        {t("delete_past_bookings")}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader title={t("delete_past_bookings")} />
          <p className="mb-4">
            {t("confirm_delete_past_bookings")}
            <br />
            <span className="mt-2 block font-medium">
              {bookingsCount} {bookingsCount === 1 ? "booking" : "bookings"} will be deleted.
            </span>
          </p>
          <DialogFooter>
            <Button color="minimal" onClick={() => setIsDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              color="destructive"
              onClick={handleDeletePastBookings}
              disabled={deletePastBookingsMutation.status === "pending"}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
