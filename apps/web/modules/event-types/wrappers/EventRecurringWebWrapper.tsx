import type { EventRecurringTabProps } from "../components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "../components/tabs/recurring/EventRecurringTab";

const EventRecurringWebWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
