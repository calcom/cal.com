import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/event-types_2024_06_14/constants/constants";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { createEventType, updateEventType } from "@calcom/platform-libraries-0.0.22";
import { getEventTypesPublic, EventTypesPublic } from "@calcom/platform-libraries-0.0.22";
import { dynamicEvent } from "@calcom/platform-libraries-0.0.22";
import {
  CreateEventTypeInput_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
  GetEventTypesQuery_2024_06_14,
  EventTypeOutput_2024_06_14,
} from "@calcom/platform-types";
import { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService_2024_06_14 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly dbWrite: PrismaWriteService,
    private readonly schedulesRepository: SchedulesRepository_2024_06_11
  ) {}

  async createUserEventType(user: UserWithProfile, body: CreateEventTypeInput_2024_06_14) {
    await this.checkCanCreateEventType(user.id, body);
    const eventTypeUser = await this.getUserToCreateEvent(user);
    const bodyTransformed = this.inputEventTypesService.transformInputCreateEventType(body);
    const { eventType: eventTypeCreated } = await createEventType({
      input: bodyTransformed,
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeCreated.id);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeCreated.id} not found`);
    }

    return this.outputEventTypesService.getResponseEventType(user.id, eventType);
  }

  async checkCanCreateEventType(userId: number, body: CreateEventTypeInput_2024_06_14) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(userId, body.slug);
    if (existsWithSlug) {
      throw new BadRequestException("User already has an event type with this slug.");
    }
    await this.checkUserOwnsSchedule(userId, body.scheduleId);
  }

  async getEventTypeByUsernameAndSlug(username: string, eventTypeSlug: string) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      return null;
    }

    const eventType = await this.eventTypesRepository.getUserEventTypeBySlug(user.id, eventTypeSlug);

    if (!eventType) {
      return null;
    }

    return this.outputEventTypesService.getResponseEventType(user.id, eventType);
  }

  async getEventTypesByUsername(username: string) {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      return [];
    }
    return this.getUserEventTypes(user.id);
  }

  async getUserToCreateEvent(user: UserWithProfile) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;
    const isOrgAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;
    const profileId = user.movedToProfile?.id || null;
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId },
      metadata: user.metadata,
    };
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    const eventType = await this.eventTypesRepository.getUserEventType(userId, eventTypeId);

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(userId, eventType);
    return this.outputEventTypesService.getResponseEventType(userId, eventType);
  }

  async getUserEventTypes(userId: number) {
    const eventTypes = await this.eventTypesRepository.getUserEventTypes(userId);

    const eventTypePromises = eventTypes.map(async (eventType) => {
      return await this.outputEventTypesService.getResponseEventType(userId, eventType);
    });

    return await Promise.all(eventTypePromises);
  }

  async getUserEventTypeForAtom(user: UserWithProfile, eventTypeId: number) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;

    const isUserOrganizationAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;

    const eventType = await this.eventTypesRepository.getUserEventTypeForAtom(
      user,
      isUserOrganizationAdmin,
      eventTypeId
    );

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(user.id, eventType.eventType);
    return eventType;
  }

  async getEventTypesPublicByUsername(username: string): Promise<EventTypesPublic> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return await getEventTypesPublic(user.id);
  }

  async getEventTypes(queryParams: GetEventTypesQuery_2024_06_14): Promise<EventTypeOutput_2024_06_14[]> {
    const { username, eventSlug, usernames } = queryParams;

    if (username && eventSlug) {
      const eventType = await this.getEventTypeByUsernameAndSlug(username, eventSlug);
      return eventType ? [eventType] : [];
    }

    if (username) {
      return await this.getEventTypesByUsername(username);
    }

    if (usernames) {
      const dynamicEventType = await this.getDynamicEventType(usernames);
      return [dynamicEventType];
    }

    return [];
  }

  async getDynamicEventType(usernames: string[]) {
    const users = await this.usersService.getByUsernames(usernames);
    const usersFiltered: UserWithProfile[] = [];
    for (const user of users) {
      if (user) {
        usersFiltered.push(user);
      }
    }

    return this.outputEventTypesService.getResponseEventType(0, {
      ...dynamicEvent,
      users: usersFiltered,
      isInstantEvent: false,
    });
  }

  async createUserDefaultEventTypes(userId: number) {
    const { sixtyMinutes, sixtyMinutesVideo, thirtyMinutes, thirtyMinutesVideo } = DEFAULT_EVENT_TYPES;

    const defaultEventTypes = await Promise.all([
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutesVideo),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutesVideo),
    ]);

    return defaultEventTypes;
  }

  async updateEventType(eventTypeId: number, body: UpdateEventTypeInput_2024_06_14, user: UserWithProfile) {
    await this.checkCanUpdateEventType(user.id, eventTypeId, body.scheduleId);
    const eventTypeUser = await this.getUserToUpdateEvent(user);
    const bodyTransformed = this.inputEventTypesService.transformInputUpdateEventType(body);
    await updateEventType({
      input: { id: eventTypeId, ...bodyTransformed },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return this.outputEventTypesService.getResponseEventType(user.id, eventType);
  }

  async checkCanUpdateEventType(userId: number, eventTypeId: number, scheduleId: number | undefined) {
    const existingEventType = await this.getUserEventType(userId, eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
    this.checkUserOwnsEventType(userId, { id: eventTypeId, userId: existingEventType.ownerId });
    await this.checkUserOwnsSchedule(userId, scheduleId);
  }

  async getUserToUpdateEvent(user: UserWithProfile) {
    const profileId = user.movedToProfile?.id || null;
    const selectedCalendars = await this.selectedCalendarsRepository.getUserSelectedCalendars(user.id);
    return { ...user, profile: { id: profileId }, selectedCalendars };
  }

  async deleteEventType(eventTypeId: number, userId: number) {
    const existingEventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    this.checkUserOwnsEventType(userId, existingEventType);

    return this.eventTypesRepository.deleteEventType(eventTypeId);
  }

  checkUserOwnsEventType(userId: number, eventType: Pick<EventType, "id" | "userId">) {
    if (userId !== eventType.userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own event type with ID=${eventType.id}`);
    }
  }

  async checkUserOwnsSchedule(userId: number, scheduleId: number | null | undefined) {
    if (!scheduleId) {
      return;
    }

    const schedule = await this.schedulesRepository.getScheduleByIdAndUserId(scheduleId, userId);

    if (!schedule) {
      throw new NotFoundException(`User with ID=${userId} does not own schedule with ID=${scheduleId}`);
    }
  }
}
