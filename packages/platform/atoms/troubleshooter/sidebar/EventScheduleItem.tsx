import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import { EventScheduleItemComponent } from "@calcom/web/modules/troubleshooter/components/EventScheduleItem";
import { useScheduleByEventSlug } from "../../hooks/useScheduleByEventSlug";

export function EventScheduleItem(): JSX.Element {
  const selectedEventType = useTroubleshooterStore((state) => state.event);

  const { data: schedule } = useScheduleByEventSlug({
    eventSlug: selectedEventType?.slug,
  });

  return <EventScheduleItemComponent schedule={schedule ?? null} />;
}
