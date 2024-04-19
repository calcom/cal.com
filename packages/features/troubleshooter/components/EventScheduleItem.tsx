import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Label } from "@calcom/ui";

import { TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";

export function EventScheduleItem() {
  const { t } = useLocale();
  const router = useRouter();
  const scheduleIdStr = router.query.scheduleId;
  const scheduleId = scheduleIdStr ? Number(scheduleIdStr) : null;
  const { data: schedule } = trpc.viewer.availability.schedule.getScheduleById.useQuery(
    {
      id: scheduleId as number,
    },
    {
      enabled: !!scheduleId,
    }
  );

  return (
    <div>
      <Label>Availability Schedule</Label>
      <TroubleshooterListItemHeader
        className="group rounded-md border-b"
        prefixSlot={<div className="w-4 rounded-[4px] bg-black" />}
        title={schedule?.name ?? "Loading"}
        suffixSlot={
          schedule && (
            <Link href={`/availability/${schedule.id}`} className="inline-flex">
              <Badge color="orange" size="sm" className="hidden hover:cursor-pointer group-hover:inline-flex">
                {t("edit")}
              </Badge>
            </Link>
          )
        }
      />
    </div>
  );
}
