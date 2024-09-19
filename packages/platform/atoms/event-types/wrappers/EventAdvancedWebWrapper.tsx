import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { trpc } from "@calcom/trpc/react";

export type EventAdvancedWebWrapperProps = Pick<EventTypeSetupProps, "eventType" | "team">;

const EventAdvancedWebWrapper = (props: EventAdvancedWebWrapperProps) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  const { data: user, isPending } = trpc.viewer.me.useQuery();
  return (
    <EventAdvancedTab
      {...props}
      connectedCalendars={connectedCalendarsQuery.data}
      user={user}
      isUserLoading={isPending}
    />
  );
};

export default EventAdvancedWebWrapper;
