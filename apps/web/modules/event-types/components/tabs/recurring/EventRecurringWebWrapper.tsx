import type { EventRecurringTabProps } from "@calcom/web/modules/event-types/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@calcom/web/modules/event-types/components/tabs/recurring/EventRecurringTab";

const EventRecurringWebWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;