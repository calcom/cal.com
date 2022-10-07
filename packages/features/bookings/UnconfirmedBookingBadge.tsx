import { trpc } from "@calcom/trpc/react";
import Badge from "@calcom/ui/v2/core/Badge";

export default function UnconfirmedBookingBadge() {
  const { data: unconfirmedBookingCount } = trpc.useQuery(["viewer.bookingUnconfirmedCount"]);
  if (!unconfirmedBookingCount) return null;
  else return <Badge variant="red">{unconfirmedBookingCount}</Badge>;
}
