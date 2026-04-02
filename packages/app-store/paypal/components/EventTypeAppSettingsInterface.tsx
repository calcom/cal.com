import {
  currencyOptions,
  currencySymbols,
  isAcceptedCurrencyCode,
} from "@calcom/app-store/paypal/lib/currencyOptions";
import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import {
  convertFromSmallestToPresentableCurrencyUnit,
  convertToSmallestCurrencyUnit,
} from "@calcom/lib/currencyConversions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select, TextField } from "@calcom/ui/components/form";
import { useEffect, useState } from "react";
import { PaypalPaymentOptions as paymentOptions } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  eventType,
}) => {
  const price = getAppData("price");

  const currency = getAppData("currency") || currencyOptions[0].value;
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions.find((c) => c.value === currency));
  const [currencySymbol, setCurrencySymbol] = useState(
    isAcceptedCurrencyCode(currency) ? currencySymbols[currency] : ""
  );

  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  useEffect(() => {
    if (requirePayment) {
      if (!getAppData("currency")) {
        setAppData("currency", currencyOptions[0].value);
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
          addOnLeading={currencySymbol}
          addOnSuffix={currency}
          step="0.01"
          min="0.5"
          type="number"
          required
          className="block w-full rounded-sm pl-2 text-sm"
          placeholder="Price"
          data-testid="paypal-price-input"
          onChange={(e) => {
            setAppData("price", convertToSmallestCurrencyUnit(Number(e.target.value), currency));
            if (selectedCurrency) {
              setAppData("currency", selectedCurrency.value);
            }
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
          data-testid="paypal-currency-select"
          options={currencyOptions}
          value={selectedCurrency}
          className="text-black"
          defaultValue={selectedCurrency}
          onChange={(e) => {
            if (e) {
              setSelectedCurrency(e);
              setCurrencySymbol(currencySymbols[e.value]);
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
          data-testid="paypal-payment-option-select"
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
  );
};

export default EventTypeAppSettingsInterface;
