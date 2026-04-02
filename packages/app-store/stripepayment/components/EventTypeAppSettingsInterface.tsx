import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import {
  convertFromSmallestToPresentableCurrencyUnit,
  convertToSmallestCurrencyUnit,
} from "@calcom/lib/currencyConversions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RefundPolicy } from "@calcom/lib/payment/types";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { CheckboxField, Select, TextField } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useEffect, useState } from "react";
import { paymentOptions } from "../lib/constants";
import { currencyOptions } from "../lib/currencyOptions";
import { autoChargeNoShowFeeTimeUnitEnum } from "../zod";

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
  const getSelectedOption = () =>
    options.find((opt) => opt.value === (getAppData("refundCountCalendarDays") === true ? 1 : 0));
  const autoChargeNoShowFeeIfCancelled = getAppData("autoChargeNoShowFeeIfCancelled");
  const autoChargeNoShowFeeTimeUnit = getAppData("autoChargeNoShowFeeTimeUnit");
  const autoChargeNoShowFeeTimeValue = getAppData("autoChargeNoShowFeeTimeValue");

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

    if (!getAppData("refundPolicy")) {
      setAppData("refundPolicy", RefundPolicy.NEVER);
    }
  }, [requirePayment, getAppData, setAppData]);

  const options = [
    { value: 0, label: t("business_days") },
    { value: 1, label: t("calendar_days") },
  ];
  const autoChangeTimeUnitOptions = [
    { value: autoChargeNoShowFeeTimeUnitEnum.enum.minutes, label: t("minutes") },
    { value: autoChargeNoShowFeeTimeUnitEnum.enum.hours, label: t("hours") },
    { value: autoChargeNoShowFeeTimeUnitEnum.enum.days, label: t("days") },
  ];
  return (
    <>
      {recurringEventDefined && (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      )}
      {!recurringEventDefined && requirePayment && (
        <>
          <div className="mt-4 block items-center justify-start sm:flex sm:space-x-2">
            <TextField
              data-testid="stripe-price-input"
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
              innerClassNames={{
                input: "stripe-currency-input",
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
            <label className="text-default mb-1 block text-sm font-medium" htmlFor="currency">
              {t("payment_option")}
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
              isDisabled={seatsEnabled || disabled}
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
                className="flex flex-col stack-y-2"
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
                  <RadioGroup.Item
                    className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2"
                    value="days"
                    id="days">
                    <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
                  </RadioGroup.Item>
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
          {paymentOption === "HOLD" && (
            <div className="mt-4">
              <div>
                <CheckboxField
                  checked={autoChargeNoShowFeeIfCancelled}
                  onChange={(e) => setAppData("autoChargeNoShowFeeIfCancelled", e.target.checked)}
                  description={t("auto_charge_for_last_minute_cancellation")}
                />
              </div>
              {autoChargeNoShowFeeIfCancelled && (
                <div>
                  <div className="mt-2 flex items-center">
                    <TextField
                      labelSrOnly
                      type="number"
                      className={classNames(
                        "border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                      )}
                      placeholder="2"
                      disabled={disabled}
                      min={0}
                      defaultValue={autoChargeNoShowFeeTimeValue}
                      required={autoChargeNoShowFeeIfCancelled}
                      value={autoChargeNoShowFeeTimeValue ?? ""}
                      onChange={(e) =>
                        setAppData("autoChargeNoShowFeeTimeValue", parseInt(e.currentTarget.value))
                      }
                    />
                    <Select
                      options={autoChangeTimeUnitOptions}
                      isSearchable={false}
                      isDisabled={disabled}
                      onChange={(option) => setAppData("autoChargeNoShowFeeTimeUnit", option?.value)}
                      value={
                        autoChangeTimeUnitOptions.find((opt) => opt.value === autoChargeNoShowFeeTimeUnit) ||
                        autoChangeTimeUnitOptions[0]
                      }
                      defaultValue={
                        autoChangeTimeUnitOptions.find((opt) => opt.value === autoChargeNoShowFeeTimeUnit) ||
                        autoChangeTimeUnitOptions[0]
                      }
                    />
                    <span className="me-2 ms-2">{t("before_scheduled_start_time")}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
