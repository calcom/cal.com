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
  const currency = getAppData("currency") || (currencyOptions.length > 0 ? currencyOptions[0].value : "");
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) ||
      (currencyOptions.length > 0
        ? {
            label: currencyOptions[0].label,
            value: currencyOptions[0].value,
          }
        : null)
  );

  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions.length > 0 ? paymentOptions[0].label : "",
    value: paymentOptions.length > 0 ? paymentOptions[0].value : "",
  };
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  // make sure a currency is selected
  useEffect(() => {
    if (requirePayment && !getAppData("currency")) {
      setAppData("currency", currencyOptions[0].value);
    }
  }, [requirePayment, getAppData, setAppData]);

  const disableDecimalPlace = (value: number) => {
    return Math.floor(value);
  };

  return (
    <>
      {recurringEventDefined ? (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      ) : (
        requirePayment && (
          <>
            <div className="mt-4 inline-block">
              <label className="text-default block text-sm font-medium mb-1" htmlFor="price">
                {t("price")}
              </label>
              <TextField
                label={t("price")}
                className="text-black dark:text-white w-auto"
                addOnClassname="h-[38px]"
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
              <label className="text-default block text-sm font-medium" htmlFor="paymentOption">
                {t("payment_option")}
              </label>
              <Select<Option>
                defaultValue={
                  paymentOptionSelectValue
                    ? { ...paymentOptionSelectValue, label: t(paymentOptionSelectValue.label) }
                    : paymentOptions.length > 0
                      ? { ...paymentOptions[0], label: t(paymentOptions[0].label) }
                      : undefined
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
