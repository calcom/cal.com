import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { Switch } from "@calcom/ui";
import EventTypeAppSettingsWrapper from "@calcom/web/components/apps/installation/EventTypeAppSettingsWrapper";

import { StripeConnect } from "../../connect/stripe/StripeConnect";

const EventPaymentsTabPlatformWrapper = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const formMethods = useFormContext<FormValues>();
  const enabledStripe = formMethods.getValues("metadata.apps.stripe.enabled");
  const [isSwitchActive, setIsSwitchActive] = useState(enabledStripe ?? false);
  const { LockedIcon } = useAppContextWithSchema();

  return (
    <div>
      This is the event payments tab to be used for platform!
      <div>
        <StripeConnect label="Add" redir={window.location.href} />
      </div>
      <div className="flex w-[100%] items-center justify-between gap-5">
        <div>
          <h1> Stripe app switch</h1>
        </div>
        <div>
          <Switch
            LockedIcon={LockedIcon}
            checked={isSwitchActive}
            onCheckedChange={(enabled) => {
              setIsSwitchActive(enabled);
              formMethods.setValue("metadata.apps.stripe.enabled", enabled, { shouldDirty: true });
            }}
            data-testid="stripe-app-switch"
          />
        </div>
      </div>
      <EventTypeAppSettingsWrapper
        eventType={eventType}
        slug="stripe"
        credentialId={19}
        categories={["payment"]}
        userName="ifxofushkq-cm1oxillv0001sbtzkm3ksqdt-example"
      />
    </div>
  );
};

export default EventPaymentsTabPlatformWrapper;
