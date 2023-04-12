import { Trans } from "next-i18next";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { IntlProvider, FormattedNumber } from "react-intl";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  showToast,
} from "@calcom/ui";
import { CreditCard, AlertTriangle } from "@calcom/ui/components/icon";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
  paymentAmount: number;
  paymentCurrency: string;
}

export const ChargeCardDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const [chargeError, setChargeError] = useState(false);
  const chargeCardMutation = trpc.viewer.payments.chargeCard.useMutation({
    onSuccess: () => {
      utils.viewer.bookings.invalidate();
      setIsOpenDialog(false);
      showToast("Charge successful", "success");
    },
    onError: () => {
      setChargeError(true);
    },
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <CreditCard className="m-auto h-6 w-6" />
          </div>
          <div className="pt-1">
            <DialogHeader title={t("charge_card")} />
            <Trans i18nKey="charge_card_dialog_body">
              <p className="text-sm text-gray-500">
                You are about to charge the attendee{" "}
                <IntlProvider locale="en">
                  <FormattedNumber
                    value={props.paymentAmount / 100.0}
                    style="currency"
                    currency={props.paymentCurrency?.toUpperCase()}
                  />
                </IntlProvider>
                . Are you sure you want to continue?
              </p>
            </Trans>

            {chargeError && (
              <div className="mt-4 flex text-red-500">
                <AlertTriangle className="mr-2 h-5 w-5 " aria-hidden="true" />
                <p className="text-sm">{t("error_charging_card")}</p>
              </div>
            )}

            <DialogFooter>
              <DialogClose />
              <Button
                data-testid="send_request"
                disabled={chargeCardMutation.isLoading || chargeError}
                onClick={() =>
                  chargeCardMutation.mutate({
                    bookingId,
                  })
                }>
                <Trans i18nKey="charge_card_confirm">
                  Charge attendee{" "}
                  <IntlProvider locale="en">
                    <FormattedNumber
                      value={props.paymentAmount / 100.0}
                      style="currency"
                      currency={props.paymentCurrency?.toUpperCase()}
                    />
                  </IntlProvider>
                </Trans>
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
