import React from "react";

// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import type { EventSetupTabProps } from "@calcom/web/modules/event-types/components/tabs/setup/EventSetupTab";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { EventSetupTab } from "@calcom/web/modules/event-types/components/tabs/setup/EventSetupTab";

const EventSetupTabPlatformWrapper = (props: EventSetupTabProps) => {
  return <EventSetupTab {...props} urlPrefix="" hasOrgBranding={false} />;
};

export default EventSetupTabPlatformWrapper;
