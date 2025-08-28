import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { MultiEmail } from "@calcom/ui/components/address";
import { Button, Input } from "@calid/features/ui";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Icon } from "@calid/features/ui";
import { showToast } from "@calcom/ui/components/toast";

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

  const addGuestsMutation = trpc.viewer.bookings.addGuests.useMutation({
    onSuccess: async () => {
      showToast(t("guests_added"), "success");
      setIsOpenDialog(false);
      setMultiEmailValue([""]);
      utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      const message = `${err.data?.code}: ${t(err.message)}`;
      showToast(message || t("unable_to_add_guests"), "error");
    },
  });

  const handleAdd = () => {
    if (multiEmailValue.length === 0) {
      return;
    }
    const validationResult = ZAddGuestsInputSchema.safeParse(multiEmailValue);
    if (validationResult.success) {
      addGuestsMutation.mutate({ bookingId, guests: multiEmailValue });
    } else {
      setIsInvalidEmail(true);
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="w-full pt-1">
            <DialogHeader title={t("additional_guests")} subtitle={t("additional_guests_sub")}/>
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
        </div>
        <DialogFooter showDivider className="mt-8">
          <Button
            onClick={() => {
              setMultiEmailValue([""]);
              setIsInvalidEmail(false);
              setIsOpenDialog(false);
            }}
            variant="outline"
            color="secondary">
            {t("cancel")}
          </Button>
          <Button variant="destructive" data-testid="add_members" 
          // loading={addGuestsMutation.isPending}
          onClick={handleAdd}>
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
