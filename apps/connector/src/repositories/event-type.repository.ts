import type { EventTypePaginationQuery } from "@/schema/event-type.schema";
import { NotFoundError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, EventType } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class EventTypeRepository extends BaseRepository<EventType> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: Prisma.EventTypeCreateInput): Promise<EventType> {
    try {
      return await this.prisma.eventType.create({
        data,
      });
    } catch (error) {
      this.handleDatabaseError(error, "create event type");
    }
  }

  async findById(id: number): Promise<EventType | null> {
    try {
      return await this.prisma.eventType.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find event type by id");
    }
  }

  async findByIdOrThrow(id: number): Promise<EventType> {
    const eventType = await this.findById(id);
    if (!eventType) {
      throw new NotFoundError("EventType");
    }
    return eventType;
  }

  async findBySlug(slug: string, userId: number): Promise<EventType | null> {
    try {
      return await this.prisma.eventType.findFirst({
        where: {
          slug,
          userId,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find event type by slug");
    }
  }

  async findByUserIdAndId(userId: number, id: number): Promise<EventType | null> {
    try {
      return await this.prisma.eventType.findFirst({
        where: {
          id,
          userId,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find event type by user id and id");
    }
  }

  async findByUserIdAndIdOrThrow(userId: number, id: number): Promise<EventType> {
    const eventType = await this.findByUserIdAndId(userId, id);
    if (!eventType) {
      throw new NotFoundError("EventType");
    }
    return eventType;
  }

  async findMany(filters: Prisma.EventTypeWhereInput = {}, pagination: EventTypePaginationQuery = {}) {
    const { title, slug, hidden } = filters;

    const where: Prisma.EventTypeWhereInput = { ...filters };

    if (title && typeof title === "string") {
      where.title = { contains: title, mode: "insensitive" };
    }

    if (slug && typeof slug === "string") {
      where.slug = { contains: slug, mode: "insensitive" };
    }

    if (typeof hidden === "boolean") {
      where.hidden = hidden;
    }

    return this.executePaginatedQuery(
      pagination, // First parameter: pagination query
      (
        options // Second parameter: findManyFn
      ) =>
        this.prisma.eventType.findMany({
          where,
          ...options, // Use the options parameter instead of paginationOptions
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            interfaceLanguage: true,
            position: true,
            locations: true,
            length: true,
            offsetStart: true,
            hidden: true,
            userId: true,
            teamId: true,
            profileId: true,
            timeZone: true,
            periodType: true,
            periodStartDate: true,
            periodEndDate: true,
            periodDays: true,
            periodCountCalendarDays: true,
            lockTimeZoneToggleOnBookingPage: true,
            lockedTimeZone: true,
            requiresConfirmation: true,
            requiresConfirmationWillBlockSlot: true,
            requiresConfirmationForFreeEmail: true,
            requiresBookerEmailVerification: true,
            recurringEvent: true,
            disableGuests: true,
            hideCalendarNotes: true,
            hideCalendarEventDetails: true,
            minimumBookingNotice: true,
            beforeEventBuffer: true,
            afterEventBuffer: true,
            seatsPerTimeSlot: true,
            onlyShowFirstAvailableSlot: true,
            disableCancelling: true,
            disableRescheduling: true,
            seatsShowAttendees: true,
            seatsShowAvailabilityCount: true,
            schedulingType: true,
            scheduleId: true,
            price: true,
            currency: true,
            slotInterval: true,
            metadata: true,
            successRedirectUrl: true,
            forwardParamsSuccessRedirect: true,
            bookingLimits: true,
            durationLimits: true,
            isInstantEvent: true,
            instantMeetingExpiryTimeOffsetInSeconds: true,
            assignAllTeamMembers: true,
            assignRRMembersUsingSegment: true,
            rrSegmentQueryValue: true,
            useEventTypeDestinationCalendarEmail: true,
            isRRWeightsEnabled: true,
            maxLeadThreshold: true,
            includeNoShowInRRCalculation: true,
            allowReschedulingPastBookings: true,
            hideOrganizerEmail: true,
            maxActiveBookingsPerBooker: true,
            maxActiveBookingPerBookerOfferReschedule: true,
            customReplyToEmail: true,
            eventTypeColor: true,
            rescheduleWithSameRoundRobinHost: true,
            secondaryEmailId: true,
            useBookerTimezone: true,
            restrictionScheduleId: true,
          },
        }),
      () => this.prisma.eventType.count({ where }) // Third parameter: countFn
    );
  }

  async findManyByUserId(
    userId: number,
    filters: Omit<Prisma.EventTypeWhereInput, "userId"> = {},
    pagination: EventTypePaginationQuery = {}
  ) {
    const whereWithUserId: Prisma.EventTypeWhereInput = {
      ...filters,
      userId,
    };

    return this.findMany(whereWithUserId, pagination);
  }

  async update(id: number, data: Prisma.EventTypeUpdateInput): Promise<EventType> {
    try {
      return await this.prisma.eventType.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleDatabaseError(error, "update event type");
    }
  }

  async updateByUserIdAndId(
    userId: number,
    id: number,
    data: Prisma.EventTypeUpdateInput
  ): Promise<EventType> {
    try {
      // First check if the event type belongs to the user
      await this.findByUserIdAndIdOrThrow(userId, id);

      return await this.update(id, data);
    } catch (error) {
      this.handleDatabaseError(error, "update event type by user id and id");
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.eventType.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete event type");
    }
  }

  async deleteByUserIdAndId(userId: number, id: number): Promise<void> {
    try {
      // First check if the event type belongs to the user
      await this.findByUserIdAndIdOrThrow(userId, id);

      await this.delete(id);
    } catch (error) {
      this.handleDatabaseError(error, "delete event type by user id and id");
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const count = await this.prisma.eventType.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check event type exists");
    }
  }

  async existsByUserIdAndId(userId: number, id: number): Promise<boolean> {
    try {
      const count = await this.prisma.eventType.count({
        where: { id, userId },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check event type exists by user id and id");
    }
  }

  async slugExists(
    slug: string,
    userId?: number,
    teamId?: number,
    excludeEventTypeId?: number
  ): Promise<boolean> {
    try {
      const where: Prisma.EventTypeWhereInput = {
        slug,
        userId,
        teamId,
      };

      if (excludeEventTypeId) {
        where.NOT = { id: excludeEventTypeId };
      }

      const count = await this.prisma.eventType.count({ where });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check slug exists");
    }
  }
}
