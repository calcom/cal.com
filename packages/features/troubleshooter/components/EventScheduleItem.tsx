import Link from "next/link";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { Badge, Label } from "@calcom/ui";

import { TroubleshooterListItemHeader } from "./TroubleshooterListItemContainer";

const querySchema = z.object({
  scheduleId: z.string().optional(),
});

export function EventScheduleItem() {
  const { t } = useLocale();
  const routerQuery = useRouterQuery();
  const scheduleId = Number(querySchema.parse(routerQuery));
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
