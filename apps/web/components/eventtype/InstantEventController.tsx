import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert, Button, EmptyScreen, SettingsToggle } from "@calcom/ui";
import { Zap } from "@calcom/ui/components/icon";

type InstantEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
};

export default function InstantEventController({ eventType, paymentEnabled }: InstantEventControllerProps) {
  const { t } = useLocale();
  const [instantEventState, setInstantEventState] = useState<RecurringEvent | null>(eventType.recurringEvent);
  const formMethods = useFormContext<FormValues>();

  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: instantEventState?.interval }),
      value: value.toString(),
    }));

  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const instantLocked = shouldLockDisableProps("instantEvent");

  // TODO: check for org
  const isOrg = true;

  return (
    <div className="block items-start sm:flex">
      {!isOrg ? (
        <EmptyScreen
          headline={t("instant_tab_title")}
          Icon={Zap}
          description={t("uprade_to_create_instant_bookings")}
          buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
        />
      ) : (
        <div className={!paymentEnabled ? "w-full" : ""}>
          {paymentEnabled ? (
            <Alert severity="warning" title={t("warning_payment_recurring_event")} />
          ) : (
            <>
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName={classNames(
                  "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                  instantEventState !== null && "rounded-b-none"
                )}
                childrenClassName="lg:ml-0"
                title={t("instant_tab_title")}
                {...instantLocked}
                description={t("instant_event_tab_description")}
                checked={instantEventState !== null}
                data-testid="instant-event-check"
                onCheckedChange={(e) => {
                  if (!e) {
                    formMethods.setValue("instantEvent", null);
                    setInstantEventState(null);
                  } else {
                    const newVal = eventType.recurringEvent || {
                      interval: 1,
                      count: 12,
                      freq: Frequency.WEEKLY,
                    };
                    formMethods.setValue("instantEvent", newVal);
                    setInstantEventState(newVal);
                  }
                }}>
                <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                  {instantEventState && (
                    <div data-testid="instant-event-collapsible" className="text-sm">
                      <div className="flex items-center">TODO: Add Zapier stuff here</div>
                    </div>
                  )}
                </div>
              </SettingsToggle>
            </>
          )}
        </div>
      )}
    </div>
  );
}
