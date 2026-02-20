import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import { EventScheduleItemComponent } from "@calcom/features/troubleshooter/components/EventScheduleItemComponent";
import { useScheduleByEventSlug } from "../../hooks/useScheduleByEventSlug";

export function EventScheduleItem(): JSX.Element {
  const selectedEventType = useTroubleshooterStore((state) => state.event);

  const { data: schedule } = useScheduleByEventSlug({
    eventSlug: selectedEventType?.slug,
  });

  return <EventScheduleItemComponent schedule={schedule ?? null} />;
}
