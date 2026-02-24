import { Timezone as PlatformTimezoneSelect } from "@calcom/atoms/timezone";
import {
  type EventAdvancedBaseProps,
  EventAdvancedTab,
} from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { useGetVerifiedEmails } from "../hooks/useGetVerifiedEmails";

const EventAdvancedPlatformWrapper = (props: EventAdvancedBaseProps) => {
  const { isPending, data: connectedCalendarsQuery, error } = useConnectedCalendars({});
  const { data: verifiedEmails } = useGetVerifiedEmails(props.team?.id);
  const { clientId } = useAtomsContext();

  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{ data: connectedCalendarsQuery, isPending, error }}
      showBookerLayoutSelector={false}
      verifiedEmails={verifiedEmails}
      isPlatform={true}
      platformClientId={clientId}
      slots={{
        SelectedCalendarsSettings: null,
        SelectedCalendarsSettingsSkeleton: null,
        TimezoneSelect: PlatformTimezoneSelect,
        MultiplePrivateLinksController: null,
        AddVerifiedEmail: null,
        BookerLayoutSelector: null,
      }}
    />
  );
};

export default EventAdvancedPlatformWrapper;
