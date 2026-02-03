import type { EventAdvancedBaseProps } from "@calcom/web/modules/event-types/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/web/modules/event-types/components/tabs/advanced/EventAdvancedTab";

import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { useGetVerifiedEmails } from "../hooks/useGetVerifiedEmails";

const EventAdvancedPlatformWrapper = (props: EventAdvancedBaseProps) => {
  const { isPending, data: connectedCalendarsQuery, error } = useConnectedCalendars({});
  const { data: verifiedEmails } = useGetVerifiedEmails(props.team?.id);

  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{ data: connectedCalendarsQuery, isPending, error }}
      showBookerLayoutSelector={false}
      verifiedEmails={verifiedEmails}
    />
  );
};

export default EventAdvancedPlatformWrapper;
