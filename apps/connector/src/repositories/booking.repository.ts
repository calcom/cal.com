import type { GetBookingsInput } from "@/schema/booking.schema";

import kysely from "@calcom/kysely";
import { getAllUserBookings } from "@calcom/platform-libraries";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class BookingRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async getUserBookings(
    queryParams: GetBookingsInput,
    user: { id: number; email: string; orgId?: number | null }
  ) {
    // if (queryParams.attendeeEmail) {
    //   queryParams.attendeeEmail = await this.getAttendeeEmail(queryParams.attendeeEmail, user);
    // }

    console.log("Query params are: ", queryParams);
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;

    const hasPageLimit = typeof queryParams.page !== "undefined" || typeof queryParams.limit !== "undefined";
    const skip = Math.abs((page - 1) * limit);
    const take = limit;

    console.log("Skip and take are: ", skip, ", ", take);

    const fetchedBookings: { bookings: { id: number }[]; totalCount: number } = await getAllUserBookings({
      bookingListingByStatus: queryParams.status || [],
      skip,
      take,
      filters: {
        ...queryParams,
        status: undefined,
        userIds: [],
      },
      ctx: {
        user,
        prisma: this.prisma,
        kysely: kysely,
      },
      sort: this.transformGetBookingsSort(queryParams),
    });

    return fetchedBookings;
  }

  transformGetBookingsSort(queryParams: GetBookingsInput) {
    if (
      !queryParams.sortStart &&
      !queryParams.sortEnd &&
      !queryParams.sortCreated &&
      !queryParams.sortUpdatedAt
    ) {
      return undefined;
    }

    return {
      sortStart: queryParams.sortStart,
      sortEnd: queryParams.sortEnd,
      sortCreated: queryParams.sortCreated,
      sortUpdated: queryParams.sortUpdatedAt,
    };
  }

  async getBookingById(id: number, expand: string[] = []) {
    const includeEventType = expand.includes("team") ? { include: { team: true } } : false;

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        attendees: true,
        user: true,
        payment: true,
        eventType: includeEventType,
      },
    });

    return booking;
  }

  async deleteBookingById(id: number) {
    try {
      const deleted = await this.prisma.booking.delete({ where: { id } });
      return deleted;
    } catch (err) {
      // surface not found as null to caller for consistent 404 handling
      return null;
    }
  }

  async existsByUserIdAndId(userId: number, id: number): Promise<boolean> {
    try {
      const count = await this.prisma.booking.count({
        where: { id, userId },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check booking exists by user id and id");
    }
  }
}
