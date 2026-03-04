import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { isRerouting } from "@calcom/lib/bookings/routing/utils";

export type RoundRobinRescheduleOption = "ROUND_ROBIN" | "SAME_HOST" | "ATTENDEE_CHOICE";

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
    roundRobinRescheduleOption,
    routedTeamMemberIds,
    attendeeReschedulePreference,
  }: {
    hosts: T[];
    rescheduleUid: string | null;
    /** Replaces the old boolean. ROUND_ROBIN = any host, SAME_HOST = same host, ATTENDEE_CHOICE = use attendeeReschedulePreference */
    roundRobinRescheduleOption: RoundRobinRescheduleOption;
    routedTeamMemberIds: number[] | null;
    /** Only used when roundRobinRescheduleOption is ATTENDEE_CHOICE. true = same host, false = any host */
    attendeeReschedulePreference?: boolean | null;
  }) {
    if (!rescheduleUid || isRerouting({ rescheduleUid, routedTeamMemberIds })) {
      return hosts;
    }

    // for ATTENDEE_CHOICE, fall back to the booking-level preference,
    // defaulting to any-host (ROUND_ROBIN) when no preference is stored yet.
    let effectiveSameHost: boolean;
    if (roundRobinRescheduleOption === "SAME_HOST") {
      effectiveSameHost = true;
    } else if (roundRobinRescheduleOption === "ATTENDEE_CHOICE") {
      // Use stored preference from the booking being rescheduled, default to any-host if not set
      effectiveSameHost = attendeeReschedulePreference ?? false;
    } else {
      // always any host
      return hosts;
    }

    if (!effectiveSameHost) {
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
