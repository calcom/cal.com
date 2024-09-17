import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";

const EventTypeSetupWebWrapper = (props: EventSetupTabProps) => {
  return <EventSetupTab {...props} />;
};

export default EventTypeSetupWebWrapper;
