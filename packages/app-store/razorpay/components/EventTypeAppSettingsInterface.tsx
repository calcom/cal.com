import { useState, useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import {
  convertToSmallestCurrencyUnit,
  convertFromSmallestToPresentableCurrencyUnit,
} from "@calcom/lib/currencyConversions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import { paymentOptions } from "../lib/constants";
import { currencyOptions } from "../lib/constants";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  eventType,
}) => {
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
  const requirePayment = getAppData("enabled");

  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

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
    <>
      {recurringEventDefined && (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      )}
      {!recurringEventDefined && requirePayment && (
        <>
          <div className="mt-4 block items-center justify-start sm:flex sm:space-x-2">
            <TextField
              data-testid="razorpay-price-input"
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
              data-testid="razorpay-currency-select"
              variant="default"
              options={currencyOptions}
              innerClassNames={{
                input: "razorpay-currency-input",
              }}
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
            <label className="text-default mb-1 block text-sm font-medium" htmlFor="payment-option">
              {t("payment_option")}
            </label>
            <Select<Option>
              data-testid="razorpay-payment-option-select"
              defaultValue={
                paymentOptionSelectValue
                  ? { ...paymentOptionSelectValue, label: t(paymentOptionSelectValue.label) }
                  : { ...paymentOptions[0], label: t(paymentOptions[0].label) }
              }
              options={paymentOptions.map((option) => {
                return { ...option, label: t(option.label) || option.label };
              })}
              onChange={(input) => {
                if (input) {
                  setAppData("paymentOption", input.value);
                }
              }}
              className="mb-1 h-[38px] w-full"
              isDisabled={disabled}
            />
          </div>
          <div className="mt-4 w-60">
            <label className="text-default mb-1 block text-sm font-medium" htmlFor="refund-policy">
              Refund Policy
            </label>
            <Select
              options={[
                { value: "NEVER", label: "Never refund" },
                { value: "ALWAYS", label: "Always refund on cancellation" },
                { value: "DAYS", label: "Refund if cancelled X days before" },
              ]}
              value={[
                { value: "NEVER", label: "Never refund" },
                { value: "ALWAYS", label: "Always refund on cancellation" },
                { value: "DAYS", label: "Refund if cancelled X days before" },
              ].find((opt) => opt.value === (getAppData("refundPolicy") || "NEVER"))}
              onChange={(option) => {
                if (option) {
                  setAppData("refundPolicy", option.value);
                  if (option.value !== "DAYS") {
                    setAppData("refundDaysCount", undefined);
                    setAppData("refundCountCalendarDays", undefined);
                  }
                }
              }}
            />
          </div>
          {getAppData("refundPolicy") === "DAYS" && (
            <>
              <div className="mt-2">
                <TextField
                  type="number"
                  label="Refund if cancelled at least X days before"
                  value={getAppData("refundDaysCount") || 7}
                  onChange={(e) => setAppData("refundDaysCount", parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <div className="mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={getAppData("refundCountCalendarDays") || false}
                    onChange={(e) => setAppData("refundCountCalendarDays", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  Count calendar days (instead of business days)
                </label>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
