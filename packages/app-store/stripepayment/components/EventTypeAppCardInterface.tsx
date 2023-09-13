import { usePathname } from "next/navigation";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Select, TextField } from "@calcom/ui";

import { paymentOptions } from "../lib/constants";
import type { appDataSchema } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const currency = getAppData("currency");
  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions.find((option) => paymentOption === option.value);
  const { enabled: requirePayment, updateEnabled: setRequirePayment } = useIsAppEnabled(app);

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
  return (
    <AppCard
      returnTo={WEBAPP_URL + pathname + "?tabName=apps"}
      app={app}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      teamId={eventType.team?.id || undefined}>
      <>
        {recurringEventDefined && (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        )}
        {!recurringEventDefined && requirePayment && (
          <>
            <div className="mt-2 block items-center justify-start sm:flex sm:space-x-2">
              <TextField
                label=""
                className="h-[38px]"
                addOnLeading={<>{currency ? getCurrencySymbol("en", currency) : ""}</>}
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
            {seatsEnabled && paymentOption === "HOLD" && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
