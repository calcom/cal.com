import { useRouter } from "next/router";
import { useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { asPath } = useRouter();
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const currency = getAppData("currency");
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
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
  return (
    <AppCard
      returnTo={WEBAPP_URL + asPath}
      setAppData={setAppData}
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
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
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        ) : (
          requirePayment && (
            <div className="mt-2 block items-center sm:flex">
              <TextField
                label=""
                addOnLeading={<>{currency ? getCurrencySymbol("en", currency) : ""}</>}
                step="0.01"
                min="0.5"
                type="number"
                required
                className="border-default block w-full rounded-sm pl-2 pr-12 text-sm"
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", Number(e.target.value) * 100);
                }}
                value={price > 0 ? price / 100 : undefined}
              />
            </div>
          )
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
