import { useRouter } from "next/router";
import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";
import type { Prisma } from ".prisma/client";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const { asPath } = useRouter();
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const [requirePayment, setRequirePayment] = useState(getAppData("enabled"));
  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  // Get the app data from the context
  const credential = app.credentials.find((c) => c.key === "currency") || { key: { currency: "MXN" } };
  const currency = (credential?.key as Prisma.JsonObject).currency as string;
  return (
    <AppCard
      returnTo={WEBAPP_URL + asPath}
      setAppData={setAppData}
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      description={<>Demo {currency}</>}>
      <>
        {recurringEventDefined ? (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        ) : (
          requirePayment && (
            <div className="mt-2 block items-center sm:flex">
              <TextField
                label=""
                addOnLeading="$"
                addOnSuffix={currency || "MXN"}
                step="0.01"
                min="0.5"
                type="number"
                required
                className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                placeholder="Price"
                onChange={(e) => {
                  setAppData("price", Number(e.target.value) * 100);
                  if (currency) {
                    setAppData("currency", currency);
                  }
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
