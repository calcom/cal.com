import type { EventAdvancedBaseProps } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";

import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";

const EventAdvancedPlatformWrapper = (props: EventAdvancedBaseProps) => {
  const { data: connectedCalendarsQuery } = useConnectedCalendars({});
  return (
    <EventAdvancedTab
      {...props}
      calendarsQueryData={connectedCalendarsQuery}
      showBookerLayoutSelector={false}
    />
  );
};

export default EventAdvancedPlatformWrapper;
