import { EventTypeSelectComponent } from "@calcom/features/troubleshooter/components/EventTypeSelectComponent";
import { trpc } from "@calcom/trpc/react";

export { EventTypeSelectComponent };

export function EventTypeSelect(): JSX.Element {
  const { data: eventTypes, isPending } =
    trpc.viewer.eventTypes.listWithTeam.useQuery();

  return (
    <EventTypeSelectComponent
      eventTypes={eventTypes ?? []}
      isPending={isPending}
    />
  );
}
