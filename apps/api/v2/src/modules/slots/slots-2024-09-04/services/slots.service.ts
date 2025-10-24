import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
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
    private readonly availableSlotsService: AvailableSlotsService,
    private readonly dbRead: PrismaReadService
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

  async getAllSlotsForDay(input: { date: string; timeZone?: string; format?: SlotFormat }) {
    const { date, timeZone, format } = input;
    const start = DateTime.fromISO(date, { zone: "utc" }).startOf("day");
    const end = DateTime.fromISO(date, { zone: "utc" }).endOf("day");

    if (!start.isValid || !end.isValid) {
      throw new BadRequestException("Invalid date. Expected ISO 8601 like 2050-09-05");
    }

    const eventTypes = await this.dbRead.prisma.eventType.findMany({
      where: {
        // Skip hidden event types to avoid noise
        hidden: { equals: false },
        // Only individual event types (owned by a user, not a team)
        userId: { not: null },
        teamId: null,
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        teamId: true,
      },
    });

    const startIso = start.toISO();
    const endIso = end.toISO();

    const results = await Promise.all(
      eventTypes.map(async (et) => {
        const internalQuery: InternalGetSlotsQuery = {
          isTeamEvent: !!et.teamId,
          startTime: startIso!,
          endTime: endIso!,
          duration: undefined,
          eventTypeId: et.id,
          eventTypeSlug: et.slug,
          usernameList: [],
          timeZone,
          orgSlug: null,
          rescheduleUid: null,
        };

        try {
          const formatted = await this.fetchAndFormatSlots(internalQuery, format);
          // The formatter returns a map keyed by dates in the requested TZ.
          // Keep only the requested date key if present.
          const formattedMap = formatted as Record<string, unknown[]>;
          const onlyRequested = formattedMap && formattedMap[date] ? { [date]: formattedMap[date] } : {};

          return {
            eventTypeId: et.id,
            eventTypeSlug: et.slug,
            ownerUserId: et.userId ?? null,
            ownerTeamId: et.teamId ?? null,
            slotsByDate: onlyRequested,
          };
        } catch {
          // Swallow per-event type errors to not fail the whole aggregation
          return {
            eventTypeId: et.id,
            eventTypeSlug: et.slug,
            ownerUserId: et.userId ?? null,
            ownerTeamId: et.teamId ?? null,
            slotsByDate: {},
          };
        }
      })
    );

    return results;
  }

  async getSlotsByUsers(input: { date: string; timeZone: string; userIds: string; format?: SlotFormat }) {
    const { date, timeZone, userIds, format } = input;

    // Validate required parameters
    if (!date) {
      throw new BadRequestException("Missing required parameter: date");
    }
    if (!timeZone) {
      throw new BadRequestException("Missing required parameter: timeZone");
    }
    if (!userIds) {
      throw new BadRequestException("Missing required parameter: userIds");
    }

    // Validate and parse date
    const start = DateTime.fromISO(date, { zone: "utc" }).startOf("day");
    const end = DateTime.fromISO(date, { zone: "utc" }).endOf("day");

    if (!start.isValid || !end.isValid) {
      throw new BadRequestException("Invalid date format. Expected ISO 8601 like 2050-09-05");
    }

    // Parse and validate userIds
    const userIdArray = userIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (userIdArray.length === 0) {
      throw new BadRequestException("userIds cannot be empty");
    }

    if (userIdArray.length > 50) {
      throw new BadRequestException("Maximum 50 user IDs allowed");
    }

    const parsedUserIds: number[] = [];
    for (const idStr of userIdArray) {
      const parsed = parseInt(idStr, 10);
      if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parseFloat(idStr))) {
        throw new BadRequestException(
          `Invalid userIds format. Must be comma-separated positive integers. Invalid value: '${idStr}'`
        );
      }
      parsedUserIds.push(parsed);
    }

    // Fetch event types for specified users only
    const eventTypes = await this.dbRead.prisma.eventType.findMany({
      where: {
        hidden: { equals: false },
        userId: { in: parsedUserIds },
        teamId: null,
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        teamId: true,
      },
    });

    // Early return if no event types found
    if (eventTypes.length === 0) {
      return [];
    }

    const startIso = start.toISO();
    const endIso = end.toISO();

    // Fetch slots for each event type in parallel
    const results = await Promise.all(
      eventTypes.map(async (et) => {
        const internalQuery: InternalGetSlotsQuery = {
          isTeamEvent: !!et.teamId,
          startTime: startIso!,
          endTime: endIso!,
          duration: undefined,
          eventTypeId: et.id,
          eventTypeSlug: et.slug,
          usernameList: [],
          timeZone,
          orgSlug: null,
          rescheduleUid: null,
        };

        try {
          const formatted = await this.fetchAndFormatSlots(internalQuery, format);
          const formattedMap = formatted as Record<string, unknown[]>;
          const onlyRequested = formattedMap && formattedMap[date] ? { [date]: formattedMap[date] } : {};

          return {
            eventTypeId: et.id,
            eventTypeSlug: et.slug,
            ownerUserId: et.userId ?? null,
            ownerTeamId: et.teamId ?? null,
            slotsByDate: onlyRequested,
          };
        } catch {
          // Swallow per-event type errors to not fail the whole aggregation
          return {
            eventTypeId: et.id,
            eventTypeSlug: et.slug,
            ownerUserId: et.userId ?? null,
            ownerTeamId: et.teamId ?? null,
            slotsByDate: {},
          };
        }
      })
    );

    return results;
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
    if (nonSeatedEventAlreadyBooked) {
      throw new UnprocessableEntityException(`Can't reserve a slot if the event is already booked.`);
    }

    const reservationDuration = input.reservationDuration ?? DEFAULT_RESERVATION_DURATION;

    await this.checkSlotOverlap(input.eventTypeId, startDate.toISO(), endDate.toISO());

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
