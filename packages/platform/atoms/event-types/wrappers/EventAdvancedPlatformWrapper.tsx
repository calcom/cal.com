import {
  EventAdvancedTab,
  type EventAdvancedBaseProps,
} from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { Timezone } from "../../timezone/index";
import { useGetVerifiedEmails } from "../hooks/useGetVerifiedEmails";

const EventAdvancedPlatformWrapper = (
  props: Omit<EventAdvancedBaseProps, "isPlatform" | "platformClientId" | "slots">
) => {
  const { isPending, data: connectedCalendarsQuery, error } = useConnectedCalendars({});
  const { data: verifiedEmails } = useGetVerifiedEmails(props.team?.id);
  const { clientId: platformClientId } = useAtomsContext();

  return (
    <EventAdvancedTab
      {...props}
      isPlatform={true}
      platformClientId={platformClientId}
      calendarsQuery={{ data: connectedCalendarsQuery, isPending, error }}
      showBookerLayoutSelector={false}
      verifiedEmails={verifiedEmails}
      slots={{
        TimezoneSelect: Timezone,
      }}
    />
  );
};

export default EventAdvancedPlatformWrapper;
