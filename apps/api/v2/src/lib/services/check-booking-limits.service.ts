import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { Injectable } from "@nestjs/common";

import type { IntervalLimit, IntervalLimitKey } from "@calcom/lib/intervalLimits/intervalLimitSchema";

interface ICheckBookingLimitsService {
  bookingRepo: PrismaBookingRepository;
}

@Injectable()
export class CheckBookingLimitsService {
  constructor(private readonly dependencies: ICheckBookingLimitsService) {}

  private async _checkBookingLimits(
    bookingLimits: IntervalLimit,
    eventStartDate: Date,
    eventId: number,
    rescheduleUid?: string | undefined,
    timeZone?: string | null,
    includeManagedEvents?: boolean
  ) {
    return true;
  }

  checkBookingLimits = this._checkBookingLimits.bind(this);

  private async _checkBookingLimit({
    eventStartDate,
    eventId,
    key,
    limitingNumber,
    rescheduleUid,
    timeZone,
    teamId,
    user,
    includeManagedEvents = false,
  }: {
    eventStartDate: Date;
    eventId?: number;
    key: IntervalLimitKey;
    limitingNumber: number | undefined;
    rescheduleUid?: string | undefined;
    timeZone?: string | null;
    teamId?: number;
    user?: { id: number; email: string };
    includeManagedEvents?: boolean;
  }) {
    return true;
  }

  checkBookingLimit = this._checkBookingLimit.bind(this);
}
