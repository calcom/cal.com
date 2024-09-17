import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";

const EventSetupTabWebWrapper = (props: EventSetupTabProps) => {
  return <EventSetupTab {...props} />;
};

export default EventSetupTabWebWrapper;
