import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, TextField } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const [getAppData, setAppData, LockedIcon, disabled] = useAppContextWithSchema<typeof appDataSchema>();
  const price = getAppData("price");
  const { enabled: requirePayment, updateEnabled: setRequirePayment } = useIsAppEnabled(app);
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;
  const seatsEnabled = !!eventType.seatsPerTimeSlot;

  const { t } = useLocale();
  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      disableSwitch={disabled}
      LockedIcon={LockedIcon}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}>
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
                addOnLeading="Local currency"
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
            {seatsEnabled && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
