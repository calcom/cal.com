import { EventRecurringTab } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";

export type EventRecurringWebWrapperProps = Pick<EventTypeSetupProps, "eventType">;

const EventRecurringWebWrapper = (props: EventRecurringWebWrapperProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
