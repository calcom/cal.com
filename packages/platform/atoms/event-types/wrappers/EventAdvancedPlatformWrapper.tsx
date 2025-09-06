import type { EventAdvancedBaseProps } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { EventAdvancedTab } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";

import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";

const EventAdvancedPlatformWrapper = (props: EventAdvancedBaseProps) => {
  const { isPending, data: connectedCalendarsQuery, error } = useConnectedCalendars({});
  // in that case I need a new endpoint in v2 to fetch verified emails for user
  // also one to add newly verified emails from an event
  // and I think custom reply to should only work on individulas first and then teams
  const verifiedEmails = ["rajiv@cal.com", "sahalrajiv2000@gmail.com"];

  console.log("----");
  console.log("these are all the verified emails data", verifiedEmails);
  console.log("----");

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
