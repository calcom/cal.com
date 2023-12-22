import { useSession } from "next-auth/react";
import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, EmptyScreen, SettingsToggle } from "@calcom/ui";
import { Zap } from "@calcom/ui/components/icon";

type InstantEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  isTeamEvent: boolean;
};

export default function InstantEventController({
  eventType,
  paymentEnabled,
  isTeamEvent,
}: InstantEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [instantEventState, setInstantEventState] = useState<boolean>(eventType?.isInstantEvent ?? false);
  const formMethods = useFormContext<FormValues>();

  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const instantLocked = shouldLockDisableProps("isInstantEvent");

  const isOrg = !!session.data?.user?.org?.id;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("instant_tab_title")}
            Icon={Zap}
            description={t("uprade_to_create_instant_bookings")}
            buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
          />
        ) : (
          <div className={!paymentEnabled ? "w-full" : ""}>
            {paymentEnabled ? (
              <Alert severity="warning" title={t("warning_payment_instant_meeting_event")} />
            ) : (
              <>
                <Alert
                  className="mb-4"
                  severity="warning"
                  title={t("warning_instant_meeting_experimental")}
                />
                <SettingsToggle
                  labelClassName="text-sm"
                  toggleSwitchAtTheEnd={true}
                  switchContainerClassName={classNames(
                    "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                    instantEventState && "rounded-b-none"
                  )}
                  childrenClassName="lg:ml-0"
                  title={t("instant_tab_title")}
                  {...instantLocked}
                  description={t("instant_event_tab_description")}
                  checked={instantEventState}
                  data-testid="instant-event-check"
                  onCheckedChange={(e) => {
                    if (!e) {
                      formMethods.setValue("isInstantEvent", false);
                      setInstantEventState(false);
                    } else {
                      formMethods.setValue("isInstantEvent", true);
                      setInstantEventState(true);
                    }
                  }}>
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    {instantEventState && (
                      <div data-testid="instant-event-collapsible" className="flex flex-col gap-2 text-sm">
                        <p>{t("warning_payment_instant_meeting_event")}</p>
                      </div>
                    )}
                  </div>
                </SettingsToggle>
              </>
            )}
          </div>
        )}
      </div>
    </LicenseRequired>
  );
}
