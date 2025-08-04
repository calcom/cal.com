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

  const organizerHost = hosts.find((host) => host.user.id === originalRescheduledBooking?.userId);
  // needed if round robin has fixed hosts or host groups
  if (originalRescheduledBooking?.attendees) {
    const attendeeEmails = originalRescheduledBooking.attendees.map((attendee) => attendee.email);
    const hostsFromAttendees = hosts.filter(
      (host) => organizerHost?.user.email !== host.user.email && attendeeEmails.includes(host.user.email)
    );
    // Filter out undefined organizerHost and return only valid hosts
    const validHosts = organizerHost ? [organizerHost, ...hostsFromAttendees] : hostsFromAttendees;

    return validHosts;
  }

  return organizerHost ? [organizerHost] : [];
};
