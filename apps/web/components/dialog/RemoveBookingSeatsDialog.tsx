import { useSession } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea } from "@calcom/ui/components/form";
import type { Option } from "@calcom/ui/components/form/checkbox/MultiSelectCheckboxes";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

// Define a more specific type for seat options
type SeatOption = Option & {
  data: {
    referenceUid: string | null;
    email: string;
    name: string | null;
  };
};

interface IRemoveBookingSeatsDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  attendees: {
    email: string;
    name?: string | null;
    referenceUid?: string;
  }[];
}

export const RemoveBookingSeatsDialog = (props: IRemoveBookingSeatsDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, bookingUid, attendees } = props;
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const [selectedOptions, setSelectedOptions] = useState<SeatOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>("");

  const handleRemove = async () => {
    setIsSubmitting(true);

    const seatReferenceUids = selectedOptions.map((option) => option.data.referenceUid).filter(Boolean);

    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: bookingUid,
          seatReferenceUid: seatReferenceUids,
          cancellationReason: cancellationReason,
          cancelledBy: session?.user?.email || undefined,
        }),
      });

      if (res.ok) {
        showToast(t("seats_removed"), "success");
        setIsOpenDialog(false);
        setSelectedOptions([]);
        utils.viewer.bookings.invalidate();
      } else {
        showToast(t("error_removing_seats"), "error");
      }
    } catch (error) {
      console.error("Error removing seats", error);
      showToast(t("error_removing_seats"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOptions = attendees.map((attendee) => ({
    label: attendee.name ? `${attendee.name}` : attendee.email,
    value: attendee.email,
    data: {
      referenceUid: attendee.referenceUid || null,
      email: attendee.email,
      name: attendee.name || null,
    },
  })) as SeatOption[];

  if (selectOptions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent className="flex flex-col">
        <div className="flex-grow">
          <div className="flex flex-row space-x-3">
            <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full">
              <Icon name="user-x" className="m-auto h-6 w-6" />
            </div>
            <div className="w-full pt-1">
              <DialogHeader title={t("remove_seats")} />
              <div className="bg-default pb-4">
                {selectOptions.length > 0 ? (
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <Select
                      isMulti
                      grow
                      options={selectOptions}
                      value={selectedOptions}
                      onChange={(newValue) => setSelectedOptions([...newValue])}
                      placeholder={t("select_seats")}
                      closeMenuOnSelect={false}
                    />
                  </div>
                ) : (
                  <div className="text-default py-2">{t("no_seats_available")}</div>
                )}

                <div className="mt-4">
                  <Label>{t("cancellation_reason_host")}</Label>
                  <TextArea
                    data-testid="cancellation_reason_host"
                    name="cancellationReason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="mb-2 mt-2 w-full"
                    rows={3}
                    placeholder={t("cancellation_reason_placeholder")}
                  />
                  <div className="flex items-center gap-2">
                    <Icon name="info" className="text-subtle h-4 w-4" />
                    <p className="text-subtle text-sm leading-none">
                      {t("notify_attendee_cancellation_reason_warning")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter showDivider className="mt-8">
            <Button
              onClick={() => {
                setSelectedOptions([]);
                setCancellationReason("");
                setIsOpenDialog(false);
              }}
              type="button"
              color="secondary"
              disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button
              data-testid="remove_seats"
              loading={isSubmitting}
              disabled={selectedOptions.length === 0 || !cancellationReason}
              onClick={handleRemove}>
              {t("remove")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
