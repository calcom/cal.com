import { useSession } from "next-auth/react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { localeOptions } from "@calcom/lib/i18n";

import type { EventSetupTabProps } from "../components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "../components/tabs/setup/EventSetupTab";

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
      isPlatform={false}
      {...props}
    />
  );
};

export default EventSetupTabWebWrapper;
