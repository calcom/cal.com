import type { EventRecurringTabProps } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";

const EventRecurringWebWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
