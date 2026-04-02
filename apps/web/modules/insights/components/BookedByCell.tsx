import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type { RoutingFormTableRow } from "@calcom/web/modules/insights/lib/types";
import { useId } from "react";
import { CellWithOverflowX } from "./CellWithOverflowX";

export function BookedByCell({
  attendees,
  rowId,
}: {
  attendees: RoutingFormTableRow["bookingAttendees"];
  rowId: number;
}) {
  const cellId = useId();
  const { t } = useLocale();
  if (!attendees || attendees.length === 0) return <div className="min-w-[200px]" />;

  return (
    <div className="flex min-w-[200px] flex-wrap gap-1">
      {attendees.map((attendee) => {
        const tooltipContent = (
          <div className="stack-y-1">
            <div>
              {t("email")}: {attendee.email}
            </div>
            {attendee.phoneNumber && (
              <div>
                {t("phone")}: {attendee.phoneNumber}
              </div>
            )}
          </div>
        );

        return (
          <CellWithOverflowX key={`${cellId}-${attendee.email}-${rowId}`} className="w-[200px]">
            <Tooltip content={tooltipContent || undefined}>
              <Badge variant="gray" className="whitespace-nowrap">
                {attendee.name}
              </Badge>
            </Tooltip>
          </CellWithOverflowX>
        );
      })}
    </div>
  );
}
