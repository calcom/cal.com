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

  // If we couldn't find the original booking or it doesn't have a userId,
  // return all hosts as a fallback to allow rescheduling
  if (!originalRescheduledBooking?.userId) {
    return hosts;
  }

  // Filter hosts to only include the original host
  const filteredHosts = hosts.filter((host) => host.user.id === originalRescheduledBooking.userId);

  // If the original host is not available (e.g., removed from event type or no availability),
  // return all hosts as a fallback
  if (filteredHosts.length === 0) {
    return hosts;
  }

  return filteredHosts;
};
