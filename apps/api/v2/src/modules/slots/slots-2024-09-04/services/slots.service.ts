import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { TimeSlots } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
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

import { getAvailableSlots } from "@calcom/platform-libraries";
import { GetSlotsInput_2024_09_04, ReserveSlotInput_2024_09_04 } from "@calcom/platform-types";
import { EventType } from "@calcom/prisma/client";

const eventTypeMetadataSchema = z.object({
  multipleDuration: z.number().array().optional(),
});

const DEFAULT_RESERVATION_DURATION = 5;

@Injectable()
export class SlotsService_2024_09_04 {
  constructor(
    private readonly eventTypeRepository: EventTypesRepository_2024_06_14,
    private readonly slotsRepository: SlotsRepository_2024_09_04,
    private readonly slotsOutputService: SlotsOutputService_2024_09_04,
    private readonly slotsInputService: SlotsInputService_2024_09_04,
    private readonly membershipsService: MembershipsService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly teamsRepository: TeamsRepository
  ) {}

  async getAvailableSlots(query: GetSlotsInput_2024_09_04) {
    const queryTransformed = await this.slotsInputService.transformGetSlotsQuery(query);

    const availableSlots: TimeSlots = await getAvailableSlots({
      input: {
        ...queryTransformed,
      },
      ctx: {},
    });

    const formatted = await this.slotsOutputService.getAvailableSlots(
      availableSlots,
      queryTransformed.eventTypeId,
      queryTransformed.duration,
      query.format,
      queryTransformed.timeZone
    );

    return formatted;
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

    const metadata = eventTypeMetadataSchema.parse(eventType);
    if (
      input.slotDuration &&
      metadata.multipleDuration &&
      !metadata.multipleDuration.includes(input.slotDuration)
    ) {
      throw new BadRequestException(
        `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths for this variable length event type are: ${metadata.multipleDuration.join(
          ", "
        )}`
      );
    }

    const endDate = startDate.plus({ minutes: input.slotDuration ?? eventType.length });
    if (!endDate.isValid) {
      throw new BadRequestException("Invalid end date");
    }

    const booking = await this.slotsRepository.getBookingWithAttendeesByEventTypeIdAndStart(
      input.eventTypeId,
      startDate.toJSDate()
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

    const metadata = eventTypeMetadataSchema.parse(eventType);
    if (
      input.slotDuration &&
      metadata.multipleDuration &&
      !metadata.multipleDuration.includes(input.slotDuration)
    ) {
      throw new BadRequestException(
        `Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths for this variable length event type are: ${metadata.multipleDuration.join(
          ", "
        )}`
      );
    }

    const endDate = startDate.plus({ minutes: input.slotDuration ?? eventType.length });
    if (!endDate.isValid) {
      throw new BadRequestException("Invalid end date");
    }

    const booking = await this.slotsRepository.getBookingWithAttendeesByEventTypeIdAndStart(
      input.eventTypeId,
      startDate.toJSDate()
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
