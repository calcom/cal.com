import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import {
  EventSetupTab,
  type EventSetupTabWrapperProps,
} from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { localeOptions } from "@calcom/lib/i18n";
import HostLocations from "@calcom/web/modules/event-types/components/locations/HostLocations";
import Locations from "@calcom/web/modules/event-types/components/locations/Locations";
import { useSession } from "next-auth/react";

const EventSetupTabWebWrapper = (props: EventSetupTabWrapperProps) => {
  const orgBranding = useOrgBranding();
  const session = useSession();
  const urlPrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;
  return (
    <EventSetupTab
      urlPrefix={urlPrefix}
      hasOrgBranding={!!orgBranding}
      orgId={session.data?.user.org?.id}
      localeOptions={localeOptions}
      components={{
        Locations: Locations,
        HostLocations: HostLocations,
      }}
      {...props}
    />
  );
};

export default EventSetupTabWebWrapper;
