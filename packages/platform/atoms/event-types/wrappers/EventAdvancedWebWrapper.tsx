import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

export type EventAdvancedWebWrapperProps = Pick<EventTypeSetupProps, "eventType" | "team"> & {
  loggedInUser?: RouterOutputs["viewer"]["me"];
  isLoggedInUserPending?: boolean;
};

const EventAdvancedWebWrapper = ({
  loggedInUser,
  isLoggedInUserPending,
  ...props
}: EventAdvancedWebWrapperProps) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  return (
    <EventAdvancedTab
      {...props}
      calendarsQueryData={connectedCalendarsQuery.data}
      user={loggedInUser}
      isUserLoading={isLoggedInUserPending}
    />
  );
};

export default EventAdvancedWebWrapper;
