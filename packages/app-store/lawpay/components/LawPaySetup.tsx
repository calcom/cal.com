import { useState, useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import {
  convertToSmallestCurrencyUnit,
  convertFromSmallestToPresentableCurrencyUnit,
} from "../../_utils/payments/currencyConversions";

type Option = { value: string; label: string };

const currencyOptions = [
  { label: "United States Dollar (USD)", value: "usd" },
  { label: "Canadian Dollar (CAD)", value: "cad" },
];

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
}) => {
  const price = getAppData("price");
  const currency = getAppData("currency") || currencyOptions[0].value;
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyOptions.find((c) => c.value === currency) || {
      label: currencyOptions[0].label,
      value: currencyOptions[0].value,
    }
  );
  const requirePayment = getAppData("enabled");
  const { t } = useLocale();

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
        setAppData("paymentOption", "ON_BOOKING");
      }
    }
  }, [requirePayment, getAppData, setAppData]);

  return (
    <div className="mt-2 block items-center sm:flex">
      <div className="min-w-48 mb-4 sm:mb-0">
        <label htmlFor="require-payment" className="flex text-sm font-medium text-gray-700">
          {t("require_payment")}
        </label>
      </div>
      <div className="w-full">
        <div className="block sm:flex">
          <div className="w-full">
            <div className="relative mt-1 rounded-md">
              <TextField
                label=""
                addOnLeading={
                  <Select<Option>
                    isDisabled={disabled}
                    defaultValue={selectedCurrency}
                    options={currencyOptions}
                    onChange={(e) => {
                      if (e) {
                        setSelectedCurrency(e);
                        setAppData("currency", e.value);
                      }
                    }}
                  />
                }
                step="0.01"
                min="0.5"
                type="number"
                required
                className="block w-full rounded-md border-gray-300 pl-16 pr-12 text-sm"
                placeholder="0.00"
                disabled={disabled}
                value={price > 0 ? convertFromSmallestToPresentableCurrencyUnit(price, currency) : undefined}
                onChange={(e) => {
                  setAppData("price", convertToSmallestCurrencyUnit(+e.target.value, currency));
                  if (!requirePayment && +e.target.value > 0) setAppData("enabled", true);
                  if (+e.target.value === 0) setAppData("enabled", false);
                }}
                addOnSuffix={getCurrencySymbol("en", currency)}
              />
            </div>
          </div>
        </div>
        {requirePayment && (
          <Alert
            className="mt-2"
            severity="warning"
            title={t("payment_required_warning")}
            message={t("payment_required_warning_description")}
          />
        )}
      </div>
    </div>
  );
};

export default EventTypeAppSettingsInterface;
