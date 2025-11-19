import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { TimeSlots } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import {
  SlotsInputService_2024_09_04,
  InternalGetSlotsQuery,
  InternalGetSlotsQueryWithRouting,
} from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import { z } from "zod";

import { SlotFormat } from "@calcom/platform-enums";
import { SchedulingType } from "@calcom/platform-libraries";
import { validateRoundRobinSlotAvailability } from "@calcom/platform-libraries/slots";
import type {
  GetSlotsInput_2024_09_04,
  GetSlotsInputWithRouting_2024_09_04,
  ReserveSlotInput_2024_09_04,
} from "@calcom/platform-types";
import type { EventType } from "@calcom/prisma/client";

const eventTypeMetadataSchema = z
  .object({
    multipleDuration: z.number().array().optional(),
  })
  .nullable();

const DEFAULT_RESERVATION_DURATION = 5;

type InternalSlotsQuery = InternalGetSlotsQuery | InternalGetSlotsQueryWithRouting;
@Injectable()
export class SlotsService_2024_09_04 {
  constructor(
    private readonly eventTypeRepository: EventTypesRepository_2024_06_14,
    private readonly slotsRepository: SlotsRepository_2024_09_04,
    private readonly slotsOutputService: SlotsOutputService_2024_09_04,
    private readonly slotsInputService: SlotsInputService_2024_09_04,
    private readonly membershipsService: MembershipsService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly teamsRepository: TeamsRepository,
    private readonly availableSlotsService: AvailableSlotsService
  ) {}

  private async fetchAndFormatSlots(queryTransformed: InternalSlotsQuery, format?: SlotFormat) {
    try {
      const availableSlots: TimeSlots = await this.availableSlotsService.getAvailableSlots({
        input: queryTransformed,
        ctx: {},
      });

      const formatted = await this.slotsOutputService.getAvailableSlots(
        availableSlots,
        queryTransformed.eventTypeId,
        queryTransformed.duration,
        format,
        queryTransformed.timeZone
      );

      return formatted;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid time range given")) {
          throw new BadRequestException(
            "Invalid time range given - check the 'start' and 'end' query parameters."
          );
        }
      }
      throw error;
    }
  }

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const queryTransformed = await this.slotsInputService.transformGetSlotsQuery(query);
    return this.fetchAndFormatSlots(queryTransformed, query.format);
  }

  async getAvailableSlotsWithRouting(query: GetSlotsInputWithRouting_2024_09_04) {
    const queryTransformed = await this.slotsInputService.transformRoutingGetSlotsQuery(query);
    return this.fetchAndFormatSlots(queryTransformed, query.format);
  }

  async reserveSlot(input: ReserveSlotInput_2024_09_04, authUserId?: number) {
    if (input.reservationDuration && !authUserId) {
      throw new UnauthorizedException(
        "reservationDuration can only be used for authenticated requests - use access token, api key or OAuth credentials"
      );
    }

    const eventType = await this.eventTypeRepository.getEventTypeWithHosts(input.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event Type with ID=${input.eventTypeId} not found`);
    }

    if (input.reservationDuration && authUserId) {
      const canSpecifyCustomReservationDuration = await this.canSpecifyCustomReservationDuration(
        authUserId,
        eventType
      );
      if (!canSpecifyCustomReservationDuration) {
        throw new ForbiddenException(
          "authenticated user is not owner of event type, does not have memberships in common with owner of the event type, nor does belong to event type's team or org."
        );
      }
    }

    const startDate = DateTime.fromISO(input.slotStart, { zone: "utc" });
    if (!startDate.isValid) {
      throw new BadRequestException("Invalid start date");
    }

    if (input.slotDuration) {
      this.validateSlotDuration(eventType, input.slotDuration);
    }

    const endDate = startDate.plus({ minutes: input.slotDuration ?? eventType.length });
    if (!endDate.isValid) {
      throw new BadRequestException("Invalid end date");
    }

    const booking = await this.slotsRepository.findActiveOverlappingBooking(
      input.eventTypeId,
      startDate.toJSDate(),
      endDate.toJSDate()
    );

    if (eventType.seatsPerTimeSlot) {
      const attendeesCount = booking?.attendees?.length;
      if (attendeesCount) {
        const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
        if (seatsLeft < 1) {
          throw new UnprocessableEntityException(
            `Booking with id=${input.eventTypeId} at ${input.slotStart} has no more seats left.`
          );
        }
      }
    }

    const nonSeatedEventAlreadyBooked = !eventType.seatsPerTimeSlot && booking;
    const isRoundRobinEvent = eventType.schedulingType === SchedulingType.ROUND_ROBIN;

    if (nonSeatedEventAlreadyBooked && !isRoundRobinEvent) {
      throw new UnprocessableEntityException(`Can't reserve a slot if the event is already booked.`);
    }

    if (isRoundRobinEvent) {
      try {
        await validateRoundRobinSlotAvailability(input.eventTypeId, startDate, endDate, eventType.hosts);
      } catch (error) {
        if (error instanceof Error) {
          throw new UnprocessableEntityException(error?.message);
        }
        throw error;
      }
    } else {
      await this.checkSlotOverlap(input.eventTypeId, startDate.toISO(), endDate.toISO());
    }

    const reservationDuration = input.reservationDuration ?? DEFAULT_RESERVATION_DURATION;

    if (eventType.userId) {
      const slot = await this.slotsRepository.createSlot(
        eventType.userId,
        eventType.id,
        startDate.toISO(),
        endDate.toISO(),
        eventType.seatsPerTimeSlot !== null,
        reservationDuration
      );
      return this.slotsOutputService.getReservationSlotCreated(slot, reservationDuration);
    }

    const host = eventType.hosts[0];
    if (!host) {
      throw new BadRequestException("Cannot reserve a slot for a team event without any hosts");
    }

    const slot = await this.slotsRepository.createSlot(
      host.userId,
      eventType.id,
      startDate.toISO(),
      endDate.toISO(),
      eventType.seatsPerTimeSlot !== null,
      reservationDuration
    );

    return this.slotsOutputService.getReservationSlotCreated(slot, reservationDuration);
  }

  private async checkSlotOverlap(eventTypeId: number, startDate: string, endDate: string) {
    const overlappingReservation = await this.slotsRepository.getOverlappingSlotReservation(
      eventTypeId,
      startDate,
      endDate
    );

    if (overlappingReservation) {
      throw new UnprocessableEntityException(
        `This time slot is already reserved by another user. Please choose a different time.`
      );
    }
  }

  validateSlotDuration(eventType: EventType, inputSlotDuration: number) {
    const eventTypeMetadata = eventTypeMetadataSchema.parse(eventType.metadata);
    if (!eventTypeMetadata?.multipleDuration) {
      throw new BadRequestException(
        "You passed 'slotDuration' but this event type is not a variable length event type."
      );
    }

    if (!eventTypeMetadata.multipleDuration.includes(inputSlotDuration)) {
      throw new BadRequestException(
        `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths for this variable length event type are: ${eventTypeMetadata.multipleDuration.join(
          ", "
        )}`
      );
    }
  }

  async canSpecifyCustomReservationDuration(authUserId: number, eventType: EventType) {
    if (eventType.userId) {
      return await this.canSpecifyCustomReservationDurationIndividualEvent(authUserId, eventType.userId);
    }
    if (eventType.teamId) {
      return await this.canSpecifyCustomReservationDurationTeamEvent(authUserId, eventType.teamId);
    }
    return false;
  }

  async canSpecifyCustomReservationDurationIndividualEvent(authUserId: number, eventTypeOwnerId: number) {
    if (authUserId === eventTypeOwnerId) return true;
    if (await this.membershipsService.haveMembershipsInCommon(authUserId, eventTypeOwnerId)) return true;
    return false;
  }

  async canSpecifyCustomReservationDurationTeamEvent(authUserId: number, teamId: number) {
    const teamMembership = await this.membershipsRepository.findMembershipByTeamId(teamId, authUserId);
    const hasAcceptedTeamMembership = !!teamMembership?.accepted;
    if (hasAcceptedTeamMembership) return true;

    const team = await this.teamsRepository.getById(teamId);
    if (!team?.parentId) {
      return false;
    }
    const orgMembership = await this.membershipsRepository.findMembershipByTeamId(team.parentId, authUserId);
    const hasAcceptedOrgMembership = !!orgMembership?.accepted;
    return hasAcceptedOrgMembership;
  }

  async getReservedSlot(uid: string) {
    const slot = await this.slotsRepository.getByUid(uid);
    if (!slot) {
      return null;
    }
    return this.slotsOutputService.getReservationSlot(slot);
  }

  async updateReservedSlot(input: ReserveSlotInput_2024_09_04, uid: string) {
    const dbSlot = await this.slotsRepository.getByUid(uid);
    if (!dbSlot) {
      throw new NotFoundException(`Slot with uid=${uid} not found`);
    }

    const eventType = await this.eventTypeRepository.getEventTypeWithHosts(input.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event Type with ID=${input.eventTypeId} not found`);
    }

    const startDate = DateTime.fromISO(input.slotStart, { zone: "utc" });
    if (!startDate.isValid) {
      throw new BadRequestException("Invalid start date");
    }

    if (input.slotDuration) {
      this.validateSlotDuration(eventType, input.slotDuration);
    }

    const endDate = startDate.plus({ minutes: input.slotDuration ?? eventType.length });
    if (!endDate.isValid) {
      throw new BadRequestException("Invalid end date");
    }

    const booking = await this.slotsRepository.findActiveOverlappingBooking(
      input.eventTypeId,
      startDate.toJSDate(),
      endDate.toJSDate()
    );

    if (eventType.seatsPerTimeSlot) {
      const attendeesCount = booking?.attendees?.length;
      if (attendeesCount) {
        const seatsLeft = eventType.seatsPerTimeSlot - attendeesCount;
        if (seatsLeft < 1) {
          throw new UnprocessableEntityException(
            `Booking with id=${input.eventTypeId} at ${input.slotStart} has no more seats left.`
          );
        }
      }
    }

    const nonSeatedEventAlreadyBooked = !eventType.seatsPerTimeSlot && booking;
    if (nonSeatedEventAlreadyBooked) {
      throw new UnprocessableEntityException(`Can't reserve a slot if the event is already booked.`);
    }

    const reservationDuration = input.reservationDuration ?? DEFAULT_RESERVATION_DURATION;

    await this.checkSlotOverlap(input.eventTypeId, startDate.toISO(), endDate.toISO());

    const slot = await this.slotsRepository.updateSlot(
      eventType.id,
      startDate.toISO(),
      endDate.toISO(),
      dbSlot.id,
      reservationDuration
    );

    return this.slotsOutputService.getReservationSlotCreated(slot, reservationDuration);
  }

  async deleteReservedSlot(uid: string) {
    return this.slotsRepository.deleteSlot(uid);
  }
}
