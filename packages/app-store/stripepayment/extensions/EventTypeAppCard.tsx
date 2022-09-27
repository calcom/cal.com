import React, { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";

import AppCard from "@calcom/app-store/_components/AppCard";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, TextField } from "@calcom/ui/v2";

export default function EventTypeAppCard({ eventType, app }) {
  const [requirePayment, setRequirePayment] = useState(eventType.price > 0);
  const formMethods = useFormContext();
  const { t } = useLocale();
  const { data: currency } = trpc.useQuery(["viewer.stripeCurrency"]);
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

  return (
    <AppCard
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(e) => {
        if (!e) {
          formMethods.setValue("price", 0);
          setRequirePayment(false);
        } else {
          setRequirePayment(true);
        }
      }}
      description={
        <>
          <div className="">
            {t("require_payment")} (0.5% +{" "}
            <IntlProvider locale="en">
              <FormattedNumber value={0.1} style="currency" currency={currency} />
            </IntlProvider>{" "}
            {t("commission_per_transaction")})
          </div>
        </>
      }>
      <>
        {recurringEventDefined ? (
          <Alert severity="warning" title={t("warning_recurring_event_payment")} />
        ) : (
          requirePayment && (
            <div className="block items-center sm:flex">
              <Controller
                defaultValue={eventType.price}
                control={formMethods.control}
                name="price"
                render={({ field }) => (
                  <TextField
                    label=""
                    addOnLeading={<>{currency ? getCurrencySymbol("en", currency) : ""}</>}
                    {...field}
                    step="0.01"
                    min="0.5"
                    type="number"
                    required
                    className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                    placeholder="Price"
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber * 100);
                    }}
                    value={field.value > 0 ? field.value / 100 : undefined}
                  />
                )}
              />
            </div>
          )
        )}
      </>
    </AppCard>
  );
}
