import { useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { TextField } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({
  getAppData,
  setAppData,
  disabled,
  eventType,
}) => {
  const { t } = useLocale();
  const price = getAppData("price");
  const requirePayment = getAppData("enabled");
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  useEffect(() => {
    if (requirePayment) {
      if (!getAppData("currency")) setAppData("currency", "IQD");
      if (!getAppData("paymentOption")) setAppData("paymentOption", "ON_BOOKING");
    }
  }, [requirePayment, getAppData, setAppData]);

  return (
    <>
      {recurringEventDefined && (
        <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
      )}
      {!recurringEventDefined && requirePayment && (
        <div className="mt-4 block items-center justify-start sm:flex sm:space-x-2">
          <TextField
            label={t("price")}
            className="h-[38px]"
            addOnLeading="IQD"
            step="1"
            min="1"
            type="number"
            required
            placeholder="e.g. 25000"
            disabled={disabled}
            onChange={(e) => {
              setAppData("price", parseInt(e.target.value, 10) || 0);
            }}
            value={price > 0 ? price : undefined}
          />
        </div>
      )}
    </>
  );
};

export default EventTypeAppSettingsInterface;
