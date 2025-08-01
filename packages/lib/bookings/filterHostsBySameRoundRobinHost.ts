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

  const originalRRHost = hosts.find((host) => host.user.id === originalRescheduledBooking?.userId);

  if (originalRRHost) {
    return [originalRRHost];
  }

  // if round robin event has fixed hosts, check if any host's email matches any attendee's email
  if (originalRescheduledBooking?.attendees) {
    const attendeeEmails = originalRescheduledBooking.attendees.map((attendee) => attendee.email);
    const hostFromAttendees = hosts.find((host) => attendeeEmails.includes(host.user.email));

    if (hostFromAttendees) {
      return [hostFromAttendees];
    }
  }

  // Return empty array if no matching host found
  return [];
};
