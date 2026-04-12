import { usePathname, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import {
  currencyOptions,
  currencySymbols,
  isAcceptedCurrencyCode,
} from "@calcom/app-store/paypal/lib/currencyOptions";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Alert } from "@calcom/ui/components/alert";

import type { appDataSchema } from "../zod";
import { paymentOptions } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const searchParams = useSearchParams();
  /** TODO "pathname" no longer contains square-bracket expressions. Rewrite the code relying on them if required. **/
  const pathname = usePathname();
  const asPath = useMemo(
    () => `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}`,
    [pathname, searchParams]
  );
  const { t } = useLocale();
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const currency = getAppData("currency");
  const paymentOption = getAppData("paymentOption");
  const enable = getAppData("enabled");

  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions.find((c) => c.value === currency));
  const [currencySymbol, setCurrencySymbol] = useState(
    isAcceptedCurrencyCode(currency) ? currencySymbols[currency] : ""
  );

  const [requirePayment, setRequirePayment] = useState(enable);

  const paymentOptionSelectValue = paymentOptions?.find((option) => paymentOption === option.value) || {
    label: paymentOptions[0].label,
    value: paymentOptions[0].value,
  };

  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      returnTo={WEBAPP_URL + asPath}
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      description={<>Add a mock payment to your events</>}>
      <>
        {recurringEventDefined ? (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        ) : (
          requirePayment && (
            <>
              <div className="mt-2 block items-center sm:flex">
                <TextField
                  id="test-mock-payment-app-price"
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
                  id="test-mock-payment-app-currency-id"
                  variant="default"
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
                  isDisabled={false}
                />
              </div>
            </>
          )
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
