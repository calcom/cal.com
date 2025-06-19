import { useState, useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import {
  currencyOptions,
  convertToSmallestCurrencyUnit,
  convertFromSmallestToPresentableCurrencyUnit,
} from "../lib/currencyOptions";
import { BTCPayPaymentOptions as paymentOptions } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  eventType,
  getAppData,
  setAppData,
}) => {
  const { t } = useLocale();
  const price = getAppData("price");
  const currency = getAppData("currency") || currencyOptions[0].value;
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) || {
      label: currencyOptions[0].label,
      value: currencyOptions[0].value,
    }
  );

  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  // make sure a currency is selected
  useEffect(() => {
    if (requirePayment && !getAppData("currency")) {
      setAppData("currency", currencyOptions[0].value);
    }
  }, []);

  const disableDecimalPlace = (value: number) => {
    const nValue = Math.floor(value);
    const sValue = nValue.toString();
    const ret = parseInt(sValue);
    return ret;
  };

  return (
    <>
      {recurringEventDefined ? (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      ) : (
        requirePayment && (
          <>
            <div className="mt-4 block items-center justify-start sm:flex sm:space-x-2">
              <TextField
                label={t("price")}
                className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                addOnClassname="h-[38px]"
                step="1"
                min="1"
                type="number"
                required
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", convertToSmallestCurrencyUnit(Number(e.target.value), currency));
                }}
                value={
                  price && price > 0
                    ? disableDecimalPlace(convertFromSmallestToPresentableCurrencyUnit(price, currency))
                    : undefined
                }
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
