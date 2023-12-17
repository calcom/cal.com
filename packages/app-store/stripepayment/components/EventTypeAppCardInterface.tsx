import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Select, TextField } from "@calcom/ui";

import { paymentOptions } from "../lib/constants";
import {
  convertToSmallestCurrencyUnit,
  convertFromSmallestToPresentableCurrencyUnit,
} from "../lib/currencyConversions";
import { currencyOptions } from "../lib/currencyOptions";
import type { appDataSchema } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const currency = getAppData("currency") || currencyOptions[0].value;
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) || {
      label: currencyOptions[0].label,
      value: currencyOptions[0].value,
    }
  );
  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions.find((option) => paymentOption === option.value);
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));

  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const getCurrencySymbol = (locale: string, currency: string) =>
    (0)
      .toLocaleString(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, "")
      .trim();

  useEffect(() => {
    if (requirePayment) {
      if (!getAppData("currency")) {
        setAppData("currency", currencyOptions[0].value);
      }
      if (!getAppData("paymentOption")) {
        setAppData("paymentOption", paymentOptions[0].value);
      }
    }
  }, [requirePayment, getAppData, setAppData]);

  return (
    <AppCard
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      teamId={eventType.team?.id || undefined}>
      <>
        {recurringEventDefined && (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        )}
        {!recurringEventDefined && requirePayment && (
          <>
            <div className="mt-4 block items-center justify-start sm:flex sm:space-x-2">
              <TextField
                data-testid="price-input-stripe"
                label={t("price")}
                className="h-[38px]"
                addOnLeading={
                  <>{selectedCurrency.value ? getCurrencySymbol("en", selectedCurrency.value) : ""}</>
                }
                addOnSuffix={currency.toUpperCase()}
                addOnClassname="h-[38px]"
                step="0.01"
                min="0.5"
                type="number"
                required
                placeholder="Price"
                disabled={disabled}
                onChange={(e) => {
                  setAppData("price", convertToSmallestCurrencyUnit(Number(e.target.value), currency));
                }}
                value={price > 0 ? convertFromSmallestToPresentableCurrencyUnit(price, currency) : undefined}
              />
            </div>
            <div className="mt-5 w-60">
              <label className="text-default mb-1 block text-sm font-medium" htmlFor="currency">
                {t("currency")}
              </label>
              <Select
                data-testid="stripe-currency-select"
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
            <div className="mt-4 w-60">
              <label className="text-default mb-1 block text-sm font-medium" htmlFor="currency">
                Payment option
              </label>
              <Select<Option>
                data-testid="stripe-payment-option-select"
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
                isDisabled={seatsEnabled || disabled}
              />
            </div>

            {seatsEnabled && paymentOption === "HOLD" && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
