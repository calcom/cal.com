import { useTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Label } from "@calcom/ui/components/form";
import Link from "next/link";
import type React from "react";
import { TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";

interface ScheduleItem {
  id: number;
  name: string;
}

interface EventScheduleItemComponentProps {
  schedule: ScheduleItem | null;
  suffixSlot?: React.ReactNode;
}

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

export function EventScheduleItemComponent({
  schedule,
  suffixSlot,
}: EventScheduleItemComponentProps): JSX.Element {
  return (
    <div>
      <Label>Availability Schedule</Label>
      <TroubleshooterListItemHeader
        className="group rounded-md border-b"
        prefixSlot={<div className="w-4 rounded-[4px] bg-black" />}
        title={schedule?.name ?? "Loading"}
        suffixSlot={suffixSlot}
      />
    </div>
  );
}
