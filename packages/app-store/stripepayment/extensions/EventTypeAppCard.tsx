import React, { useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, TextField } from "@calcom/ui/v2";
//TODO: Find a better place to import from
import { eventTypeAppContext } from "@calcom/web/components/v2/eventtype/EventAppsTab";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const [getAppData, setAppData] = React.useContext(eventTypeAppContext);
  const price = getAppData("price");
  const currency = getAppData("currency");
  const [requirePayment, setRequirePayment] = useState(price > 0);
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
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(e) => {
        if (!e) {
          setAppData("price", 0);
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
              <TextField
                label=""
                addOnLeading={<>{currency ? getCurrencySymbol("en", currency) : ""}</>}
                step="0.01"
                min="0.5"
                type="number"
                required
                className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", e.target.valueAsNumber * 100);
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
