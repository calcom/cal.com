import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { isRerouting } from "@calcom/lib/bookings/routing/utils";

export interface IFilterHostsService {
  bookingRepo: BookingRepository;
}

export class FilterHostsService {
  constructor(public readonly dependencies: IFilterHostsService) {}

  async filterHostsBySameRoundRobinHost<
    T extends {
      isFixed: false; // ensure no fixed hosts are passed.
      user: { id: number; email: string };
    },
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
  }) {
    if (
      !rescheduleUid ||
      !rescheduleWithSameRoundRobinHost ||
      isRerouting({ rescheduleUid, routedTeamMemberIds })
    ) {
      return hosts;
    }

    const originalRescheduledBooking =
      await this.dependencies.bookingRepo.findOriginalRescheduledBookingUserId({
        rescheduleUid,
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
  }
}
