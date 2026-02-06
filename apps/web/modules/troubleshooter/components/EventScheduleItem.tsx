import { EventScheduleItemComponent } from "@calcom/features/troubleshooter/components/EventScheduleItemComponent";
import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import Link from "next/link";

export { EventScheduleItemComponent };

export function EventScheduleItem(): JSX.Element {
  const { t } = useLocale();
  const selectedEventType = useTroubleshooterStore((state) => state.event);

  const { data: schedule } =
    trpc.viewer.availability.schedule.getScheduleByEventSlug.useQuery(
      {
        eventSlug: selectedEventType?.slug as string,
      },
      {
        enabled: !!selectedEventType?.slug,
      }
    );

  return (
    <EventScheduleItemComponent
      schedule={schedule ?? null}
      suffixSlot={
        schedule && (
          <Link href={`/availability/${schedule.id}`} className="inline-flex">
            <Badge
              color="orange"
              size="sm"
              className="invisible hover:cursor-pointer group-hover:visible"
            >
              {t("edit")}
            </Badge>
          </Link>
        )
      }
    />
  );
}
