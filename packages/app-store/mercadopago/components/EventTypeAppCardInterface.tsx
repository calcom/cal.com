import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Select, TextField } from "@calcom/ui";
import type { Option } from "@calcom/ui/components/form";

import { currencyOptions, paymentOptions } from "../lib/constants";
import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const { t } = useLocale();

  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const currency = getAppData("currency");
  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions.find((option) => paymentOption === option.value);
  const currencyOptionSelectValue = currencyOptions.find((option) => currency === option.value);
  const { enabled: requirePayment, updateEnabled: setRequirePayment } = useIsAppEnabled(app);

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

  return (
    <AppCard
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      description={<>Add MercadoPago payment to your events</>}>
      <>
        {recurringEventDefined ? (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        ) : requirePayment ? (
          <>
            <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <div className="w-60">
                <label className="text-default block text-sm font-medium" htmlFor="currency">
                  {t("currency")}
                </label>

                <Select<Option>
                  defaultValue={
                    currencyOptionSelectValue
                      ? { ...currencyOptionSelectValue, label: t(currencyOptionSelectValue.label) }
                      : undefined
                  }
                  options={currencyOptions.map((option) => {
                    return { ...option, label: t(option.label) || option.label };
                  })}
                  onChange={(input) => {
                    if (input) setAppData("currency", input.value);
                  }}
                  className="mb-1 h-[38px] w-full"
                  isDisabled={seatsEnabled || disabled}
                />

                <p className="text-subtle mt-2 text-sm">Select the currency allowed by your Business</p>
              </div>

              <div className="w-60">
                <label className="text-default block text-sm font-medium" htmlFor="currency">
                  {t("price")}
                </label>
                <TextField
                  className="h-[38px]"
                  addOnLeading={currency ? <>{getCurrencySymbol("en", currency)}</> : null}
                  addOnClassname="h-[38px]"
                  step="0.01"
                  min="0.5"
                  type="number"
                  required
                  placeholder="Price"
                  disabled={disabled}
                  onChange={(e) => {
                    setAppData("price", Number(e.target.value) * 100);
                  }}
                  value={price > 0 ? price / 100 : undefined}
                />
              </div>

              <div className="w-60">
                <label className="text-default block text-sm font-medium" htmlFor="currency">
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
                  isDisabled={seatsEnabled || disabled}
                />
              </div>
            </div>

            {seatsEnabled && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        ) : null}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
