import type { EventAdvancedBaseProps } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { trpc } from "@calcom/trpc/react";

const EventAdvancedWebWrapper = ({ ...props }: EventAdvancedBaseProps) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{
        data: connectedCalendarsQuery.data,
        isPending: connectedCalendarsQuery.isPending,
        error: connectedCalendarsQuery.error,
      }}
      showBookerLayoutSelector={true}
    />
  );
};

export default EventAdvancedWebWrapper;
