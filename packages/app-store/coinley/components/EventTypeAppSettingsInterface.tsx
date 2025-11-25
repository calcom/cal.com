import { useState, useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

const paymentOptions = [
  { label: "on_booking_paid", value: "ON_BOOKING" },
  { label: "hold_charge_card_on_booking_and_charge_on_event", value: "HOLD" },
];

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  eventType,
}) => {
  const price = getAppData("price");
  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment, _setRequirePayment] = useState(getAppData("enabled"));
  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  useEffect(() => {
    if (requirePayment) {
      // Currency is selected by user in payment modal (USDT or USDC)
      if (!getAppData("paymentOption")) {
        setAppData("paymentOption", "ON_BOOKING");
      }
    }
  }, [requirePayment, getAppData, setAppData]);

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
          addOnSuffix="USD"
          step="0.01"
          min="0.01"
          type="number"
          required
          className="block w-full rounded-sm pl-2 text-sm"
          placeholder={t("price")}
          data-testid="coinley-price-input"
          onChange={(e) => {
            const value = Number(e.target.value);
            // Store price in cents for consistency with other payment apps
            setAppData("price", Math.round(value * 100));
          }}
          value={price > 0 ? price / 100 : undefined}
        />
      </div>
      <p className="text-default mt-1 text-xs text-gray-500">
        Customers can choose to pay with USDT or USDC in the payment modal
      </p>

      <div className="mt-4 w-60">
        <label className="text-default mb-1 block text-sm font-medium" htmlFor="payment-option">
          {t("payment_option")}
        </label>
        <Select<Option>
          data-testid="coinley-payment-option-select"
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

      <div className="mt-4">
        <Alert
          className="mt-2"
          severity="info"
          title={t("coinley_supported_cryptocurrencies")}
          message={
            <div className="space-y-2 text-sm">
              <p>
                <strong>{t("coinley_stablecoins")}:</strong> USDT, USDC
              </p>
              <p>
                <strong>{t("coinley_networks")}:</strong> Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Celo, Base
              </p>
              <p className="mt-2 text-xs text-gray-600">
                {t("coinley_payment_info")}
              </p>
            </div>
          }
        />
      </div>
    </>
  );
};

export default EventTypeAppSettingsInterface;
