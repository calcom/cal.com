import type { EventRecurringTabProps } from "../tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "../tabs/recurring/EventRecurringTab";

const EventRecurringWebWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
