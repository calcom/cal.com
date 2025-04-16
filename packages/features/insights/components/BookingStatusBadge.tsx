import { BookingStatus } from "@calcom/prisma/enums";
import { Badge } from "@calcom/ui/components/badge";
import { type BadgeProps } from "@calcom/ui/components/badge";

import { bookingStatusToText } from "../lib/bookingStatusToText";

export function BookingStatusBadge({ bookingStatus }: { bookingStatus: BookingStatus | null }) {
  let badgeVariant: BadgeProps["variant"] = "success";

  if (!bookingStatus) return null;

  switch (bookingStatus) {
    case BookingStatus.REJECTED:
    case BookingStatus.AWAITING_HOST:
    case BookingStatus.PENDING:
    case BookingStatus.CANCELLED:
      badgeVariant = "warning";
      break;
  }

  return <Badge variant={badgeVariant}>{bookingStatusToText(bookingStatus)}</Badge>;
}
