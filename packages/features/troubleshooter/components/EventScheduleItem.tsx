import { trpc } from "@calcom/trpc/react";
import { Label } from "@calcom/ui";

import { useTroubleshooterStore } from "../store";
import { TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";

export function EventScheduleItem() {
  const selectedEventType = useTroubleshooterStore((state) => state.eventSlug);

  const { data: schedule, isLoading } = trpc.viewer.availability.schedule.getScheduleByEventSlug.useQuery(
    {
      eventSlug: selectedEventType as string, // Only enabled when selectedEventType is not null
    },
    {
      enabled: !!selectedEventType,
    }
  );

  return (
    <div>
      <Label>Availability Schedule</Label>
      <TroubleshooterListItemHeader
        className="rounded-md border-b " // Target paragraph inside nested children to make medium (saves us from creating a new component)
        prefixSlot={<div className="w-4 rounded-[4px] bg-black" />}
        title={schedule?.name ?? "Loading"}
      />
    </div>
  );
}
