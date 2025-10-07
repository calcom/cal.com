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
    // Optional attendee email normalization (uncomment if needed)
    // if (queryParams.attendeeEmail) {
    //   queryParams.attendeeEmail = await this.getAttendeeEmail(queryParams.attendeeEmail, user);
    // }

    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;

    const skip = Math.max(0, (page - 1) * limit);
    const take = limit;

    // Prepare filters for the internal query
    const filters = {
      ...queryParams,
      status: undefined, // avoid redundancy since status is separately handled
      userIds: queryParams.userIds?.length ? queryParams.userIds : [],
    };

    const params = {
      bookingListingByStatus: Array.isArray(queryParams.status)
        ? queryParams.status
        : queryParams.status
        ? [queryParams.status]
        : [],
      skip,
      take,
      filters,
      ctx: {
        user,
        prisma: this.prisma,
        kysely,
      },
      sort: this.transformGetBookingsSort(queryParams),
    };

    const {
      bookings,
      // recurringInfo,
      totalCount,
    } = await getAllUserBookings(params);

    return {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      bookings,
      // recurringInfo,
    };
  }

  transformGetBookingsSort(queryParams: GetBookingsInput) {
    if (
      !queryParams.sortStart &&
      !queryParams.sortEnd &&
      !queryParams.sortCreated &&
      !queryParams.sortUpdated
    ) {
      return undefined;
    }

    return {
      sortStart: queryParams.sortStart,
      sortEnd: queryParams.sortEnd,
      sortCreated: queryParams.sortCreated,
      sortUpdated: queryParams.sortUpdated,
    };
  }

  async getBookingById(id: number, expand: string[] = []) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        attendees: true,
        user: true,
        payment: true,
        eventType: {
          select: {
            id: true,
            title: true,
            length: true,
            slug: true,
            schedulingType: true,
            price: true,
            currency: true,
            calIdTeamId: true,
            locations: true,
            metadata: true,
            calIdTeam: {
              select: { id: true, name: true, slug: true },
            },
            hosts: {
              select: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
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
