import type { EventRecurringTabProps } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";

const EventRecurringTabPlatformWrapper = (
  props: EventRecurringTabProps & { hideRecurringAlert?: boolean }
) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringTabPlatformWrapper;
