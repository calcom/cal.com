import type { Dayjs } from "@calcom/dayjs";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import type { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import type { UserRepository } from "@calcom/lib/server/repository/user";

import type {
  GetUserAvailabilityInitialData,
  GetUserAvailabilityInput,
  GetUserAvailabilityResult,
  CurrentSeats,
  EventType,
} from "../../getUserAvailability";
import { _getUserAvailability } from "../../getUserAvailability";

export interface IUserAvailabilityService {
  eventTypeRepo: EventTypeRepository;
  bookingRepo: BookingRepository;
  oooRepo: PrismaOOORepository;
  userRepo: UserRepository;
}

export class UserAvailabilityService {
  constructor(public readonly dependencies: IUserAvailabilityService) {}

  private async _getEventType(id: number): Promise<EventType | null> {
    return await this.dependencies.eventTypeRepo.findForUserAvailability({ id });
  }

  private async _getCurrentSeats(
    eventType: {
      id?: number;
      schedulingType?: any;
      hosts?: {
        user: {
          email: string;
        };
      }[];
    },
    dateFrom: Dayjs,
    dateTo: Dayjs
  ): Promise<CurrentSeats> {
    return await this.dependencies.bookingRepo.findCurrentSeats({
      eventType,
      dateFrom: dateFrom.format(),
      dateTo: dateTo.format(),
    });
  }

  private async _getOutOfOfficeDays(userId: number, dateFrom: Dayjs, dateTo: Dayjs) {
    const oooEntries = await this.dependencies.oooRepo.findManyOOO({
      startTimeDate: dateFrom.toDate(),
      endTimeDate: dateTo.toDate(),
      allUserIds: [userId],
    });

    return oooEntries.map((entry) => ({
      id: entry.id,
      start: entry.start,
      end: entry.end,
      user: entry.user,
      toUser: entry.toUser,
      reason: entry.reason,
    }));
  }

  public getEventType = withReporting(this._getEventType.bind(this), "getEventType");
  public getCurrentSeats = withReporting(this._getCurrentSeats.bind(this), "getCurrentSeats");
  public getOutOfOfficeDays = withReporting(this._getOutOfOfficeDays.bind(this), "getOutOfOfficeDays");

  async getUserAvailability(
    query: GetUserAvailabilityInput,
    initialData?: GetUserAvailabilityInitialData
  ): Promise<GetUserAvailabilityResult> {
    const getEventType = this.getEventType;
    const getCurrentSeats = this.getCurrentSeats;
    const getOutOfOfficeDays = this.getOutOfOfficeDays;

    return await _getUserAvailability(query, initialData, {
      getEventType,
      getCurrentSeats,
      getOutOfOfficeDays,
    });
  }
}
