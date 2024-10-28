import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type {
  EventTypeApp,
  EventTypeForAppCard,
} from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import useAppsData from "@calcom/lib/hooks/useAppsData";
import { EmptyScreen } from "@calcom/ui";

import { StripeConnect } from "../../connect/stripe/StripeConnect";
import { useCheck } from "../../hooks/stripe/useCheck";
import { useAtomsEventTypeById } from "../hooks/useAtomEventTypeAppIntegration";

const EventPaymentsTabPlatformWrapper = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const { allowConnect, checked } = useCheck({});
  const isStripeConnected = !checked || !allowConnect;

  return (
    <div>
      {!isStripeConnected ? (
        <EmptyScreen
          Icon="grid-3x3"
          headline="Stripe not connected"
          description="You need to connect Stripe to use this feature. Pleae click on the button below to connect."
          buttonRaw={
            <StripeConnect
              label="Connect to Stripe"
              loadingLabel="Connect to Stripe"
              alreadyConnectedLabel="Connect to Stripe"
              isClickable={true}
              color="secondary"
              redir={window.location.href}
            />
          }
        />
      ) : (
        <StripeAppCard eventType={eventType} />
      )}
    </div>
  );
};

const StripeAppCard = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const { getAppDataGetter, getAppDataSetter, eventTypeFormMetadata } = useAppsData();
  const { data: stripeData, isLoading } = useAtomsEventTypeById("stripe");

  const transformedAppData = {
    ...stripeData?.app,
    logo: `https://app.cal.com${stripeData?.app.logo}`,
  };

  if (isLoading || !stripeData) return null;

  return (
    <div>
      <EventTypeAppCard
        getAppData={getAppDataGetter(transformedAppData.slug as EventTypeAppsList)}
        setAppData={getAppDataSetter(
          transformedAppData.slug as EventTypeAppsList,
          transformedAppData.categories as string[],
          transformedAppData.userCredentialIds && (transformedAppData.userCredentialIds[0] as number)
        )}
        key={transformedAppData.slug}
        app={transformedAppData as EventTypeApp}
        eventType={eventType as unknown as EventTypeForAppCard}
        eventTypeFormMetadata={eventTypeFormMetadata}
      />
    </div>
  );
};

export default EventPaymentsTabPlatformWrapper;
