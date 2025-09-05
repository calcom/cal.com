import type { EventLimitsTabProps } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import { EventLimitsTab } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";

const EventLimitsTabPlatformWrapper = (props: EventLimitsTabProps) => {
  return <EventLimitsTab {...props} />;
};

export default EventLimitsTabPlatformWrapper;
