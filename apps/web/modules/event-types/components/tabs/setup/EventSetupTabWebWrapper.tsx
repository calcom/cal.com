import { useSession } from "next-auth/react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { localeOptions } from "@calcom/lib/i18n";

import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import CalVideoSettings from "../../locations/CalVideoSettings";
import DefaultLocationSettings from "../../locations/DefaultLocationSettings";
import HostLocations from "../../locations/HostLocations";

const EventSetupTabWebWrapper = (props: EventSetupTabProps) => {
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
      CalVideoSettingsComponent={CalVideoSettings}
      DefaultLocationSettingsComponent={DefaultLocationSettings}
      HostLocationsComponent={HostLocations}
      {...props}
    />
  );
};

export default EventSetupTabWebWrapper;
