import type { BookingRepository } from "@calcom/lib/server/repository/booking";

import { isRerouting } from "./routing/utils";

export interface IFilterHostsService {
  bookingRepo: BookingRepository;
}

export class FilterHostsService {
  constructor(public readonly dependencies: IFilterHostsService) {}

  async filterHostsBySameRoundRobinHost<
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

    return hosts.filter((host) => host.user.id === originalRescheduledBooking?.userId || 0);
  }
}
