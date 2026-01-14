import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import {
  TransformedCreateTeamEventTypeInput,
  TransformedUpdateTeamEventTypeInput,
} from "@/modules/organizations/event-types/services/input.service";
import { DatabaseTeamEventType } from "@/modules/organizations/event-types/services/output.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, Logger } from "@nestjs/common";

import type { SortOrderType } from "@calcom/platform-types";

import { createEventType, updateEventType } from "@calcom/platform-libraries/event-types";

@Injectable()
export class TeamsEventTypesService {
  private readonly logger = new Logger("TeamsEventTypesService");

  constructor(
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly dbWrite: PrismaWriteService,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly usersService: UsersService
  ) {}

  async createTeamEventType(
    user: UserWithProfile,
    teamId: number,
    body: TransformedCreateTeamEventTypeInput
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    // note(Lauris): once phone only event types / bookings are enabled for simple users remove checkHasUserAccessibleEmailBookingField check
    if (body.bookingFields) {
      this.eventTypesService.checkHasUserAccessibleEmailBookingField(body.bookingFields);
    }
    const eventTypeUser = await this.getUserToCreateTeamEvent(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hosts, children, destinationCalendar, ...rest } = body;

    const { eventType: eventTypeCreated } = await createEventType({
      input: { teamId: teamId, ...rest },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    return this.updateTeamEventType(eventTypeCreated.id, teamId, body, user, false);
  }

  async validateEventTypeExists(teamId: number, eventTypeId: number) {
    const eventType = await this.teamsEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
  }

  async getUserToCreateTeamEvent(user: UserWithProfile) {
    const profileId = this.usersService.getUserMainProfile(user)?.id;

    return {
      id: user.id,
      role: user.role,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: { id: profileId || null },
      metadata: user.metadata,
      email: user.email,
    };
  }

  async getTeamEventType(teamId: number, eventTypeId: number): Promise<DatabaseTeamEventType | null> {
    const eventType = await this.teamsEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      return null;
    }

    return eventType;
  }

  async getTeamEventTypeBySlug(
    teamId: number,
    eventTypeSlug: string,
    hostsLimit?: number
  ): Promise<DatabaseTeamEventType | null> {
    const eventType = await this.teamsEventTypesRepository.getTeamEventTypeBySlug(
      teamId,
      eventTypeSlug,
      hostsLimit
    );

    if (!eventType) {
      return null;
    }

    return eventType;
  }

  async getTeamEventTypes(teamId: number, sortCreatedAt?: SortOrderType): Promise<DatabaseTeamEventType[]> {
    return await this.teamsEventTypesRepository.getTeamEventTypes(teamId, sortCreatedAt);
  }

  async updateTeamEventType(
    eventTypeId: number,
    teamId: number,
    body: TransformedUpdateTeamEventTypeInput,
    user: UserWithProfile,
    // note(Lauris): once phone only event types / bookings are enabled for simple users remove isOrg parameter (right now only organization team event types support hidden / non-required email field)
    isOrg: boolean
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    if (!isOrg && body.bookingFields) {
      // note(Lauris): once phone only event types / bookings are enabled for simple users remove checkHasUserAccessibleEmailBookingField check
      this.eventTypesService.checkHasUserAccessibleEmailBookingField(body.bookingFields);
    }
    await this.validateEventTypeExists(teamId, eventTypeId);
    const eventTypeUser = await this.eventTypesService.getUserToUpdateEvent(user);
    await updateEventType({
      input: {
        id: eventTypeId,
        ...body,
      },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.teamsEventTypesRepository.getEventTypeById(eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    if (eventType.schedulingType !== "MANAGED") {
      return eventType;
    }

    const childrenEventTypes = await this.teamsEventTypesRepository.getEventTypeChildren(eventType.id);

    return [eventType, ...childrenEventTypes];
  }

  async deleteTeamEventType(teamId: number, eventTypeId: number) {
    const existingEventType = await this.teamsEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!existingEventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    return this.eventTypesRepository.deleteEventType(eventTypeId);
  }
}
