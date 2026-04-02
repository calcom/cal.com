import type { EventLimitsTabProps } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import { EventLimitsTab } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";

const EventLimitsTabWebWrapper = (props: EventLimitsTabProps) => {
  return <EventLimitsTab {...props} />;
};

export default EventLimitsTabWebWrapper;
