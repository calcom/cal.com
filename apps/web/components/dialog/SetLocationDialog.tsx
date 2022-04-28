import { LocationMarkerIcon } from "@heroicons/react/outline";
import React, { useState, Dispatch, SetStateAction } from "react";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import { TextArea } from "@calcom/ui/form/fields";

import { inferQueryOutput, trpc } from "@lib/trpc";

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  booking: BookingItem;
}

export const SetLocationDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking: booking } = props;
  const [currentLocation, setCurrentLocation] = useState(booking.location || "");
  const [location, setLocation] = useState(booking.location || "");
  const mutation = trpc.useMutation("viewer.updateBooking");

  const newMutation = useMutation(async () => {
    const res = await fetch("/api/book/changeLocation", {
      method: "POST",
      body: JSON.stringify({
        id: booking.id,
        location,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <LocationMarkerIcon className="m-auto h-6 w-6"></LocationMarkerIcon>
          </div>
          <div className="pt-1">
            <DialogHeader title="Set Location" />
            <p className="mt-6 mb-2 text-sm font-bold text-black">Current booking locaiton:</p>
            <p className="mb-2 text-sm text-black">{currentLocation}</p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">Change location to:</p>
            <TextArea
              data-testid="reschedule_reason"
              name={t("reschedule_reason")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mb-5 sm:mb-6"
            />

            <DialogFooter>
              <DialogClose>
                <Button color="secondary">{t("cancel")}</Button>
              </DialogClose>
              <Button
                data-testid="send_request"
                onClick={() => {
                  mutation.mutate({ id: booking.id, location });
                  setIsOpenDialog(false);
                  setCurrentLocation(location);
                  newMutation.mutate();
                }}>
                Change location
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
