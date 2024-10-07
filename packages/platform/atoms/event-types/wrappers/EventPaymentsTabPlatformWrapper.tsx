import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import useAppsData from "@calcom/lib/hooks/useAppsData";

//import { Switch } from "@calcom/ui";
// import EventTypeAppSettingsWrapper from "@calcom/web/components/apps/installation/EventTypeAppSettingsWrapper";
import { StripeConnect } from "../../connect/stripe/StripeConnect";

const EventPaymentsTabPlatformWrapper = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const formMethods = useFormContext<FormValues>();
  const enabledStripe = formMethods.getValues("metadata.apps.stripe.enabled");
  const [isSwitchActive, setIsSwitchActive] = useState(enabledStripe ?? false);
  const { LockedIcon } = useAppContextWithSchema();

  const { getAppDataGetter, getAppDataSetter, eventTypeFormMetadata } = useAppsData();
  const app = {
    appData: null,
    dirName: "stripepayment",
    __template: "",
    name: "Stripe",
    description:
      "A Saas company a payment processing software, and application programming interfaces for e-commerce websites and mobile applications.",
    installed: true,
    slug: "stripe",
    category: "payment",
    categories: ["payment"],
    logo: "/app-store/stripepayment/icon.svg",
    publisher: "Cal.com",
    title: "Stripe",
    type: "stripe_payment",
    url: "https://cal.com/",
    docsUrl: "https://stripe.com/docs",
    variant: "payment",
    extendsFeature: "EventType",
    email: "help@cal.com",
    isOAuth: true,
    locationOption: null,
    enabled: true,
    userCredentialIds: [],
    invalidCredentialIds: [],
    teams: [],
    isInstalled: true,
    isSetupAlready: true,
  };

  return (
    <div>
      This is the event payments tab to be used for platform!
      <div>
        <StripeConnect label="Add" redir={window.location.href} />
      </div>
      {/* <div className="flex w-[100%] items-center justify-between gap-5">
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
      </div> */}
      {/* <EventTypeAppSettingsWrapper
        eventType={eventType}
        slug="stripe"
        credentialId={19}
        categories={["payment"]}
        userName="ifxofushkq-cm1oxillv0001sbtzkm3ksqdt-example"
      /> */}
      <EventTypeAppCard
        getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
        setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.categories, app.userCredentialIds[0])}
        key={app.slug}
        app={app}
        eventType={eventType}
        eventTypeFormMetadata={eventTypeFormMetadata}
      />
    </div>
  );
};

export default EventPaymentsTabPlatformWrapper;
