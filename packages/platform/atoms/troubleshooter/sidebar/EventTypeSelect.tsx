import { EventTypeSelectComponent } from "@calcom/web/modules/troubleshooter/components/EventTypeSelect";
import { useEventTypesList } from "../../hooks/useEventTypesList";

export function EventTypeSelect(): JSX.Element {
  const { data: eventTypes, isPending } = useEventTypesList({});

  return (
    <EventTypeSelectComponent
      eventTypes={eventTypes ?? []}
      isPending={isPending}
    />
  );
}
