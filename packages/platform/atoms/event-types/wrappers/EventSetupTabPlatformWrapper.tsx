import React from "react";

import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";

const EventSetupTabPlatformWrapper = (props: EventSetupTabProps) => {
  return <EventSetupTab {...props} urlPrefix="" hasOrgBranding={false} />;
};

export default EventSetupTabPlatformWrapper;
