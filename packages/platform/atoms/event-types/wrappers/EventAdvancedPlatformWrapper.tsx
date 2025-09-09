import type { EventAdvancedBaseProps } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";

import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";

const EventAdvancedPlatformWrapper = (props: EventAdvancedBaseProps) => {
  const { isPending, data: connectedCalendarsQuery, error } = useConnectedCalendars({});
  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{ data: connectedCalendarsQuery, isPending, error }}
      showBookerLayoutSelector={false}
    />
  );
};

export default EventAdvancedPlatformWrapper;
