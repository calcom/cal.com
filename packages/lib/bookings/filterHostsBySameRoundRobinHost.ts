import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { isRerouting } from "./routing/utils";

export const filterHostsBySameRoundRobinHost = async <
  T extends {
    isFixed: false; // ensure no fixed hosts are passed.
    user: { id: number };
  }
>({
  hosts,
  rescheduleUid,
  rescheduleWithSameRoundRobinHost,
  routedTeamMemberIds,
}: {
  hosts: T[];
  rescheduleUid: string | null;
  rescheduleWithSameRoundRobinHost: boolean;
  routedTeamMemberIds: number[] | null;
}) => {
  if (
    !rescheduleUid ||
    !rescheduleWithSameRoundRobinHost ||
    isRerouting({ rescheduleUid, routedTeamMemberIds })
  ) {
    return hosts;
  }
  const originalRescheduledBooking = await prisma.booking.findFirst({
    where: {
      uid: rescheduleUid,
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
      },
    },
    select: {
      userId: true,
    },
  });

  return hosts.filter((host) => host.user.id === originalRescheduledBooking?.userId || 0);
};
