import { EventLimitsTab } from "@calcom/web/modules/event-types/components/tabs/limits/EventLimitsTab";
import type { EventLimitsTabProps } from "@calcom/web/modules/event-types/components/tabs/limits/EventLimitsTab";

const EventLimitsTabPlatformWrapper = (props: EventLimitsTabProps) => {
  return <EventLimitsTab {...props} />;
};

export default EventLimitsTabPlatformWrapper;
