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
          <div className="w-full pt-1 pr-2">
            <DialogHeader title={t("set_location")} />
            <p className="mt-6 mb-2 text-sm font-bold text-black">{t("current_location")}:</p>
            <p className="mb-2 text-sm text-black">{currentLocation ? currentLocation : t("no_location")}</p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">{t("new_location")}:</p>
            <TextArea
              name={t("new_location")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mb-5 w-full sm:mb-6"
            />

            <DialogFooter>
              <DialogClose>
                <Button color="secondary">{t("cancel")}</Button>
              </DialogClose>
              <Button
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
