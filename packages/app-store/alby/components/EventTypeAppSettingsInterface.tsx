import { currencyOptions } from "@calcom/app-store/alby/lib/currencyOptions";
import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select, TextField } from "@calcom/ui/components/form";
import { SatSymbol } from "@calcom/ui/components/icon";
import { useEffect, useState } from "react";
import { PaypalPaymentOptions as paymentOptions } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  eventType,
  getAppData,
  setAppData,
}) => {
  const { t } = useLocale();
  const price = getAppData("price");
  const currency = getAppData("currency");
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) || currencyOptions[0]
  );

  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };

  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment] = useState(getAppData("enabled"));
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  // make sure a currency is selected
  useEffect(() => {
    if (!currency && requirePayment) {
      setAppData("currency", selectedCurrency.value);
    }
  }, [currency, selectedCurrency, setAppData, requirePayment]);

  return (
    <>
      {recurringEventDefined ? (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      ) : (
        requirePayment && (
          <>
            <div className="mt-2 block items-center sm:flex">
              <TextField
                label="Price"
                labelSrOnly
                addOnLeading={<SatSymbol className="h-4 w-4" />}
                addOnSuffix={selectedCurrency.unit || selectedCurrency.value}
                type="number"
                required
                className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", Number(e.target.value));
                  if (currency) {
                    setAppData("currency", currency);
                  }
                }}
                value={price && price > 0 ? price : undefined}
              />
            </div>
            <div className="mt-5 w-60">
              <label className="text-default block text-sm font-medium" htmlFor="currency">
                {t("currency")}
              </label>
              <Select
                variant="default"
                options={currencyOptions}
                value={selectedCurrency}
                className="text-black"
                defaultValue={selectedCurrency}
                onChange={(e) => {
                  if (e) {
                    setSelectedCurrency(e);
                    setAppData("currency", e.value);
                  }
                }}
              />
            </div>

            <div className="mt-2 w-60">
              <label className="text-default block text-sm font-medium" htmlFor="currency">
                Payment option
              </label>
              <Select<Option>
                defaultValue={
                  paymentOptionSelectValue
                    ? { ...paymentOptionSelectValue, label: t(paymentOptionSelectValue.label) }
                    : { ...paymentOptions[0], label: t(paymentOptions[0].label) }
                }
                options={paymentOptions.map((option) => {
                  return { ...option, label: t(option.label) || option.label };
                })}
                onChange={(input) => {
                  if (input) setAppData("paymentOption", input.value);
                }}
                className="mb-1 h-[38px] w-full"
                isDisabled={seatsEnabled}
              />
            </div>
            {seatsEnabled && paymentOption === "HOLD" && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        )
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
