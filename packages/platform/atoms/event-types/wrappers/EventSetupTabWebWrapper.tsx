import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { WEBSITE_URL } from "@calcom/lib/constants";

const EventSetupTabWebWrapper = (props: EventSetupTabProps) => {
  const orgBranding = useOrgBranding();
  const urlPrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;
  return <EventSetupTab urlPrefix={urlPrefix} hasOrgBranding={!!orgBranding} {...props} />;
};

export default EventSetupTabWebWrapper;
