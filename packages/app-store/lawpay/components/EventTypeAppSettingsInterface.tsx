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

import { LawPayPaymentOptions as paymentOptions } from "../zod";

const currencyOptions = [{ value: "USD", label: "USD" }];

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  eventType,
}) => {
  const price = getAppData("price");
  const currency = getAppData("currency") || "USD";
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions.find((c) => c.value === currency));
  const paymentOption = getAppData("paymentOption");
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  useEffect(() => {
    if (requirePayment) {
      if (!getAppData("currency")) {
        setAppData("currency", "USD");
      }
      if (!getAppData("paymentOption")) {
        setAppData("paymentOption", paymentOptions[0].value);
      }
    }
  }, []);

  if (recurringEventDefined) {
    return <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />;
  }

  if (!requirePayment) {
    return null;
  }

  return (
    <>
      <div className="mt-2 block items-center sm:flex">
        <TextField
          label="Price"
          labelSrOnly
          addOnLeading="$"
          addOnSuffix={currency}
          step="0.01"
          min="0.5"
          type="number"
          required
          className="block w-full rounded-sm pl-2 text-sm"
          placeholder="Price"
          data-testid="lawpay-price-input"
          onChange={(e) => {
            setAppData("price", convertToSmallestCurrencyUnit(Number(e.target.value), currency));
            setAppData("currency", currency);
          }}
          value={price > 0 ? convertFromSmallestToPresentableCurrencyUnit(price, currency) : undefined}
        />
      </div>
      <div className="mt-5 w-60">
        <label className="text-default mb-1 block text-sm font-medium" htmlFor="currency">
          {t("currency")}
        </label>
        <Select
          variant="default"
          data-testid="lawpay-currency-select"
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
    </>
  );
};

export default EventTypeAppSettingsInterface;
