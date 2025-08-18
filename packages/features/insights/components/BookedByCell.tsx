import { useId } from "react";

import { Badge } from "@calcom/ui/components/badge";

import type { RoutingFormTableRow } from "../lib/types";
import { CellWithOverflowX } from "./CellWithOverflowX";

export function BookedByCell({
  attendees,
  rowId,
}: {
  attendees: RoutingFormTableRow["bookingAttendees"] | undefined;
  rowId: number;
}) {
  const cellId = useId();
  if (!attendees || attendees.length === 0) return <div className="min-w-[200px]" />;

  return (
    <div className="flex min-w-[200px] flex-wrap gap-1">
      {attendees.map((attendee) => (
        <CellWithOverflowX key={`${cellId}-${attendee.email}-${rowId}`} className="w-[200px]">
          <Badge variant="gray" className="whitespace-nowrap" title={attendee.email}>
            {attendee.name}
          </Badge>
        </CellWithOverflowX>
      ))}
    </div>
  );
}
