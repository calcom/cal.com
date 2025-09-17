import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { MultiEmail } from "@calcom/ui/components/address";
import { triggerToast } from "@calid/features/ui/components/toast";

interface IAddGuestsDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
}

export const AddGuestsDialog = (props: IAddGuestsDialog) => {
  const { t } = useLocale();
  const ZAddGuestsInputSchema = z.array(z.string().email()).refine((emails) => {
    const uniqueEmails = new Set(emails);
    return uniqueEmails.size === emails.length;
  });
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const utils = trpc.useUtils();
  const [multiEmailValue, setMultiEmailValue] = useState<string[]>([""]);
  const [isInvalidEmail, setIsInvalidEmail] = useState(false);

  const addGuestsMutation = trpc.viewer.bookings.calid_addGuests.useMutation({
    onSuccess: async () => {
      triggerToast(t("guests_added"), "success");
      setIsOpenDialog(false);
      setMultiEmailValue([""]);
      utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      const message = `${err.data?.code}: ${t(err.message)}`;
      triggerToast(message || t("unable_to_add_guests"), "error");
    },
  });

  const handleAdd = () => {
    const validEmails = multiEmailValue.filter(email => email.trim() !== "");
    if (validEmails.length === 0) {
      return;
    }
    const validationResult = ZAddGuestsInputSchema.safeParse(validEmails);
    if (validationResult.success) {
      addGuestsMutation.mutate({ bookingId, guests: validEmails });
    } else {
      setIsInvalidEmail(true);
    }
  };

  // Check if there are any valid emails to enable/disable the Add button
  const hasValidEmails = multiEmailValue.some(email => email.trim() !== "");

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader>
          <DialogTitle>{t("additional_guests")}</DialogTitle>
        </DialogHeader>
        <div className="w-full pt-1">
          <div className="bg-default">
            <MultiEmail
              label={t("add_emails")}
              value={multiEmailValue}
              readOnly={false}
              setValue={setMultiEmailValue}
            />
          </div>

          {isInvalidEmail && (
            <div className="my-4 flex text-sm text-red-700">
              <div className="flex-shrink-0">
                <Icon name="triangle-alert" className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="font-medium">{t("emails_must_be_unique_valid")}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-8">
          <Button
            onClick={() => {
              setMultiEmailValue([""]);
              setIsInvalidEmail(false);
              setIsOpenDialog(false);
            }}
            color="secondary">
            {t("cancel")}
          </Button>
          <Button
            data-testid="add_members"
            loading={addGuestsMutation.isPending}
            disabled={!hasValidEmails}
            onClick={handleAdd}>
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
