import { EventTypeRepository } from "@/repositories/event-type.repository";
import type { EventTypeResponse, createEventTypeBodySchema, updateEventTypeBodySchema } from "@/schema/event-type.schema";
import type { PaginationQuery } from "@/types";
import { ConflictError } from "@/utils";
import type { z } from "zod";

import type { PrismaClient } from "@calcom/prisma/client";
import type { EventType, Prisma } from "@calcom/prisma/client";

import { BaseService } from "../base.service";

type CreateEventTypeInput = z.infer<typeof createEventTypeBodySchema>;
type UpdateEventTypeInput = z.infer<typeof updateEventTypeBodySchema>;

export class EventTypeService extends BaseService {
  private eventTypeRepository: EventTypeRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.eventTypeRepository = new EventTypeRepository(prisma);
  }

  async getEventTypeById(userId: number, id: number): Promise<EventTypeResponse> {
    this.logOperation("getEventTypeById", { userId, id });

    try {
      const eventType = await this.eventTypeRepository.findByUserIdAndIdOrThrow(userId, id);
      return this.mapEventTypeToResponse(eventType);
    } catch (error) {
      this.logError("getEventTypeById", error);
      throw error;
    }
  }

  async getEventTypes(
    userId: number,
    filters: Omit<Prisma.EventTypeWhereInput, 'userId'> = {}, 
    pagination: PaginationQuery<Prisma.EventTypeOrderByWithRelationInput> = {}
  ) {
    this.logOperation("getEventTypes", { userId, filters, pagination });

    try {
      const result = await this.eventTypeRepository.findManyByUserId(userId, filters, pagination);

      return {
        data: result.data.map((eventType: any) => this.mapEventTypeToResponse(eventType)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getEventTypes", error);
      throw error;
    }
  }

  async eventTypeExists(userId: number, id: number): Promise<boolean> {
    try {
      return await this.eventTypeRepository.existsByUserIdAndId(userId, id);
    } catch (error) {
      this.logError("eventTypeExists", error);
      throw error;
    }
  }

  async createEventType(userId: number, input: CreateEventTypeInput): Promise<EventTypeResponse> {
    this.logOperation("createEventType", { userId, input });

    try {
      // Check if slug already exists for this user
      const existingEventType = await this.eventTypeRepository.slugExists(input.slug, userId);
      if (existingEventType) {
        throw new ConflictError("Event type with this slug already exists for this user");
      }

      const eventType = await this.eventTypeRepository.create({
        ...input,
        owner: {
          connect: { id: userId }
        },
        users: {
          connect: { id: userId }
        }
      });

      return this.mapEventTypeToResponse(eventType);
    } catch (error) {
      this.logError("createEventType", error);
      throw error;
    }
  }

  async updateEventType(
    userId: number, 
    id: number, 
    input: UpdateEventTypeInput
  ): Promise<EventTypeResponse> {
    this.logOperation("updateEventType", { userId, id, input });

    try {
      // Check if event type exists and belongs to user
      const existingEventType = await this.eventTypeRepository.findByUserIdAndIdOrThrow(userId, id);

      // Check if slug already exists for this user (excluding current event type)
      if (input.slug && input.slug !== existingEventType.slug) {
        const slugExists = await this.eventTypeRepository.slugExists(input.slug, userId, undefined, id);
        if (slugExists) {
          throw new ConflictError("Event type with this slug already exists for this user");
        }
      }

      const payload: Prisma.EventTypeUpdateInput = { ...input };

      const updatedEventType = await this.eventTypeRepository.updateByUserIdAndId(userId, id, payload);
      return this.mapEventTypeToResponse(updatedEventType);
    } catch (error) {
      this.logError("updateEventType", error);
      throw error;
    }
  }

  async deleteEventType(userId: number, id: number): Promise<void> {
    this.logOperation("deleteEventType", { userId, id });

    try {
      await this.eventTypeRepository.deleteByUserIdAndId(userId, id);
    } catch (error) {
      this.logError("deleteEventType", error);
      throw error;
    }
  }

  private mapEventTypeToResponse(eventType: EventType): EventTypeResponse {
    return {
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description,
      interfaceLanguage: eventType.interfaceLanguage,
      position: eventType.position,
      locations: eventType.locations,
      length: eventType.length,
      offsetStart: eventType.offsetStart,
      hidden: eventType.hidden,
      userId: eventType.userId,
      teamId: eventType.teamId,
      profileId: eventType.profileId,
      timeZone: eventType.timeZone,
      periodType: eventType.periodType,
      periodStartDate: eventType.periodStartDate,
      periodEndDate: eventType.periodEndDate,
      periodDays: eventType.periodDays,
      periodCountCalendarDays: eventType.periodCountCalendarDays,
      lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage,
      lockedTimeZone: eventType.lockedTimeZone,
      requiresConfirmation: eventType.requiresConfirmation,
      requiresConfirmationWillBlockSlot: eventType.requiresConfirmationWillBlockSlot,
      requiresConfirmationForFreeEmail: eventType.requiresConfirmationForFreeEmail,
      requiresBookerEmailVerification: eventType.requiresBookerEmailVerification,
      recurringEvent: eventType.recurringEvent,
      disableGuests: eventType.disableGuests,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      minimumBookingNotice: eventType.minimumBookingNotice,
      beforeEventBuffer: eventType.beforeEventBuffer,
      afterEventBuffer: eventType.afterEventBuffer,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      onlyShowFirstAvailableSlot: eventType.onlyShowFirstAvailableSlot,
      disableCancelling: eventType.disableCancelling,
      disableRescheduling: eventType.disableRescheduling,
      seatsShowAttendees: eventType.seatsShowAttendees,
      seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount,
      schedulingType: eventType.schedulingType,
      scheduleId: eventType.scheduleId,
      price: eventType.price,
      currency: eventType.currency,
      slotInterval: eventType.slotInterval,
      metadata: eventType.metadata,
      successRedirectUrl: eventType.successRedirectUrl,
      forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect,
      bookingLimits: eventType.bookingLimits,
      durationLimits: eventType.durationLimits,
      isInstantEvent: eventType.isInstantEvent,
      instantMeetingExpiryTimeOffsetInSeconds: eventType.instantMeetingExpiryTimeOffsetInSeconds,
      assignAllTeamMembers: eventType.assignAllTeamMembers,
      assignRRMembersUsingSegment: eventType.assignRRMembersUsingSegment,
      rrSegmentQueryValue: eventType.rrSegmentQueryValue,
      useEventTypeDestinationCalendarEmail: eventType.useEventTypeDestinationCalendarEmail,
      isRRWeightsEnabled: eventType.isRRWeightsEnabled,
      maxLeadThreshold: eventType.maxLeadThreshold,
      includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
      allowReschedulingPastBookings: eventType.allowReschedulingPastBookings,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
      maxActiveBookingPerBookerOfferReschedule: eventType.maxActiveBookingPerBookerOfferReschedule,
      customReplyToEmail: eventType.customReplyToEmail,
      eventTypeColor: eventType.eventTypeColor,
      rescheduleWithSameRoundRobinHost: eventType.rescheduleWithSameRoundRobinHost,
      secondaryEmailId: eventType.secondaryEmailId,
      useBookerTimezone: eventType.useBookerTimezone,
      restrictionScheduleId: eventType.restrictionScheduleId,
    };
  }
}