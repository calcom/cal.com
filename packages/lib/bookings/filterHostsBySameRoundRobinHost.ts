import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { isRerouting } from "./routing/utils";

export const filterHostsBySameRoundRobinHost = async <
  T extends {
    isFixed: false; // ensure no fixed hosts are passed.
    user: { id: number; email: string };
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
      attendees: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!originalRescheduledBooking) {
    return hosts;
  }

  const attendeeEmails = originalRescheduledBooking.attendees?.map((attendee) => attendee.email) || [];

  return hosts.filter((host) => {
    const isOrganizer = host.user.id === originalRescheduledBooking.userId;
    const isAttendee = attendeeEmails.includes(host.user.email);
    return isOrganizer || isAttendee;
  });
};
