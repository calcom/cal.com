// Razorpay settings
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useState, useEffect } from "react";

import { currencyOptions, isAcceptedCurrencyCode } from "@calcom/app-store/razorpay/lib/currencyOptions";
import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RefundPolicy } from "@calcom/lib/payment/types";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Select, TextField } from "@calcom/ui/components/form";
import { Radio, RadioField, RadioIndicator } from "@calcom/ui/components/radio";

import { RazorpayPaymentOptions as paymentOptions } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  eventType,
}) => {
  const price = getAppData("price");

  const currency = "INR";

  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions.find((c) => c.value === "INR"));

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

  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };
  const seatsEnabled = !!eventType.seatsPerTimeSlot;
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));

  const getSelectedOption = () =>
    options.find((opt) => opt.value === (getAppData("refundCountCalendarDays") === true ? 1 : 0));

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
      if (!getAppData("refundPolicy")) {
        setAppData("refundPolicy", RefundPolicy.NEVER);
      }
    }
  }, [requirePayment, getAppData, setAppData]);

  const options = [
    { value: 0, label: t("business_days") },
    { value: 1, label: t("calendar_days") },
  ];

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
          addOnLeading={selectedCurrency?.value ? getCurrencySymbol("en", selectedCurrency.value) : ""}
          addOnSuffix={selectedCurrency?.value ?? "INR"}
          step="0.01"
          min="0.5"
          type="number"
          required
          className="block w-full rounded-sm pl-2 text-sm"
          placeholder="Price"
          data-testid="razorpay-price-input"
          disabled={disabled}
          onChange={(e) => {
            setAppData("price", Number(e.target.value) * 100);
            if (selectedCurrency) {
              setAppData("currency", selectedCurrency.value);
            }
          }}
          value={price > 0 ? price / 100 : undefined}
        />
      </div>
      <div className="mt-5 w-60">
        <label className="text-default mb-1 block text-sm font-medium" htmlFor="currency">
          {t("currency")}
        </label>
        <Select
          variant="default"
          data-testid="razorpay-currency-select"
          options={currencyOptions}
          value={selectedCurrency}
          className="text-black"
          defaultValue={selectedCurrency}
          isDisabled={disabled}
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
              if (input.value === "HOLD") {
                setAppData("refundPolicy", RefundPolicy.NEVER);
                setAppData("refundDaysCount", undefined);
                setAppData("refundCountCalendarDays", undefined);
              }
            }
          }}
          className="mb-1 h-[38px] w-full"
          isDisabled={seatsEnabled}
        />
      </div>
      {seatsEnabled && paymentOption === "HOLD" && (
        <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
      )}

      {paymentOption !== "HOLD" && (
        <div className="mt-4 w-full">
          <label className="text-default mb-1 block text-sm font-medium">{t("refund_policy")}</label>
          <RadioGroup.Root
            disabled={disabled || paymentOption === "HOLD"}
            defaultValue="never"
            className="flex flex-col space-y-2"
            value={getAppData("refundPolicy")}
            onValueChange={(val) => {
              setAppData("refundPolicy", val);
              if (val !== RefundPolicy.DAYS) {
                setAppData("refundDaysCount", undefined);
                setAppData("refundCountCalendarDays", undefined);
              }
            }}>
            <RadioField className="w-fit" value={RefundPolicy.ALWAYS} label={t("always")} id="always" />
            <RadioField className="w-fit" value={RefundPolicy.NEVER} label={t("never")} id="never" />
            <div className={classNames("text-default mb-2 flex flex-wrap items-center text-sm")}>
              <Radio value="days" id="days">
                <RadioIndicator />
              </Radio>
              <div className="flex items-center">
                <span className="me-2 ms-2">&nbsp;{t("if_cancelled")}</span>
                <TextField
                  labelSrOnly
                  type="number"
                  className={classNames(
                    "border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                  )}
                  placeholder="2"
                  disabled={disabled}
                  min={0}
                  defaultValue={getAppData("refundDaysCount")}
                  required={getAppData("refundPolicy") === RefundPolicy.DAYS}
                  value={getAppData("refundDaysCount") ?? ""}
                  onChange={(e) => setAppData("refundDaysCount", parseInt(e.currentTarget.value))}
                />
                <Select
                  options={options}
                  isSearchable={false}
                  isDisabled={disabled}
                  onChange={(option) => setAppData("refundCountCalendarDays", option?.value === 1)}
                  value={getSelectedOption()}
                  defaultValue={getSelectedOption()}
                />
                <span className="me-2 ms-2">&nbsp;{t("before")}</span>
              </div>
            </div>
          </RadioGroup.Root>
        </div>
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
