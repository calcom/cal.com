import { Trans } from "next-i18next";
import type { Dispatch, SetStateAction } from "react";
import { IntlProvider, FormattedNumber } from "react-intl";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";
import { FiCreditCard } from "@calcom/ui/components/icon";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUId: string;
  paymentAmount: number;
  paymentCurrency: string;
}

export const ChargeCardDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId } = props;

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <FiCreditCard className="m-auto h-6 w-6" />
          </div>
          <div className="pt-1">
            <DialogHeader title={t("charge_card")} />
            {/* <p className="text-sm text-gray-500">{t("reschedule_modal_description")}</p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">
              {t("reason_for_reschedule_request")}
              <span className="font-normal text-gray-500"> (Optional)</span>
            </p> */}
            <Trans i18nKey="charge_card_dialog_body">
              <p className="text-sm text-gray-500">
                You are about to charge the user{" "}
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

            <DialogFooter>
              <DialogClose />
              <Button
                data-testid="send_request"
                //   disabled={isLoading}
                //   onClick={() => {}}
              >
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
