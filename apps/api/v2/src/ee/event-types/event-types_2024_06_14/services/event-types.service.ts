import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/event-types_2024_06_14/constants/constants";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { InputEventTransformed_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/transformed";
import { SystemField, CustomField } from "@/ee/event-types/event-types_2024_06_14/transformers";
import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { dynamicEvent } from "@calcom/platform-libraries";
import {
  createEventType,
  updateEventType,
  getEventTypesPublic,
  EventTypesPublic,
} from "@calcom/platform-libraries/event-types";
import { GetEventTypesQuery_2024_06_14 } from "@calcom/platform-types";
import { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService_2024_06_14 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly dbWrite: PrismaWriteService,
    private readonly schedulesRepository: SchedulesRepository_2024_06_11
  ) {}

  async createUserEventType(user: UserWithProfile, body: InputEventTransformed_2024_06_14) {
    if (body.bookingFields) {
      this.checkHasUserAccessibleEmailBookingField(body.bookingFields);
    }
    await this.checkCanCreateEventType(user.id, body);
    const eventTypeUser = await this.getUserToCreateEvent(user);
    const { destinationCalendar: _destinationCalendar, ...rest } = body;

    const { eventType: eventTypeCreated } = await createEventType({
      input: rest,
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    await updateEventType({
      input: {
        id: eventTypeCreated.id,
        ...body,
      },
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

    return {
      ownerId: user.id,
      ...eventType,
    };
  }

  async checkCanCreateEventType(userId: number, body: InputEventTransformed_2024_06_14) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(userId, body.slug);
    if (existsWithSlug) {
      throw new BadRequestException("User already has an event type with this slug.");
    }
    await this.checkUserOwnsSchedule(userId, body.scheduleId);
  }

  checkHasUserAccessibleEmailBookingField(bookingFields: (SystemField | CustomField)[]) {
    const emailField = bookingFields.find((field) => field.type === "email" && field.name === "email");
    const isEmailFieldRequiredAndVisible = emailField?.required && !emailField?.hidden;
    if (!isEmailFieldRequiredAndVisible) {
      throw new BadRequestException(
        "checkIsEmailUserAccessible - Email booking field must be required and visible"
      );
    }
  }

  async getEventTypeByUsernameAndSlug(
    username: string,
    eventTypeSlug: string,
    orgSlug?: string,
    orgId?: number
  ) {
    const user = await this.usersRepository.findByUsername(username, orgSlug, orgId);
    if (!user) {
      return null;
    }

    const eventType = await this.eventTypesRepository.getUserEventTypeBySlug(user.id, eventTypeSlug);

    if (!eventType) {
      return null;
    }

    return {
      ownerId: user.id,
      ...eventType,
    };
  }

  async getEventTypesByUsername(username: string, orgSlug?: string, orgId?: number) {
    const user = await this.usersRepository.findByUsername(username, orgSlug, orgId);
    if (!user) {
      return [];
    }
    return await this.getUserEventTypes(user.id);
  }

  async getUserToCreateEvent(user: UserWithProfile) {
    const organizationId = this.usersService.getUserMainOrgId(user);
    const isOrgAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;
    const profileId = this.usersService.getUserMainProfile(user)?.id || null;
    const selectedCalendars = await this.selectedCalendarsRepository.getUserSelectedCalendars(user.id);
    const eventTypeSelectedCalendars =
      await this.selectedCalendarsRepository.getUserEventTypeSelectedCalendar(user.id);
    return {
      id: user.id,
      locale: user.locale ?? "en",
      role: user.role,
      username: user.username,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId },
      metadata: user.metadata,
      selectedCalendars,
      email: user.email,
      userLevelSelectedCalendars: selectedCalendars,
      allSelectedCalendars: [...eventTypeSelectedCalendars, ...selectedCalendars],
    };
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    const eventType = await this.eventTypesRepository.getUserEventType(userId, eventTypeId);

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(userId, eventType);

    return {
      ownerId: userId,
      ...eventType,
    };
  }

  async getUserEventTypes(userId: number) {
    const eventTypes = await this.eventTypesRepository.getUserEventTypes(userId);

    return eventTypes.map((eventType) => {
      return { ownerId: userId, ...eventType };
    });
  }

  async getEventTypesPublicByUsername(username: string): Promise<EventTypesPublic> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return await getEventTypesPublic(user.id);
  }

  async getEventTypes(queryParams: GetEventTypesQuery_2024_06_14) {
    const { username, eventSlug, usernames, orgSlug, orgId } = queryParams;
    if (username && eventSlug) {
      const eventType = await this.getEventTypeByUsernameAndSlug(username, eventSlug, orgSlug, orgId);
      return eventType ? [eventType] : [];
    }

    if (username) {
      return await this.getEventTypesByUsername(username, orgSlug, orgId);
    }

    if (usernames) {
      const dynamicEventType = await this.getDynamicEventType(usernames, orgSlug, orgId);
      return [dynamicEventType];
    }

    return [];
  }

  async getDynamicEventType(usernames: string[], orgSlug?: string, orgId?: number) {
    const users = await this.usersService.getByUsernames(usernames, orgSlug, orgId);
    const usersFiltered: UserWithProfile[] = [];
    for (const user of users) {
      if (user) {
        usersFiltered.push(user);
      }
    }
    return {
      ownerId: 0,
      ...dynamicEvent,
      users: usersFiltered,
      isInstantEvent: false,
    };
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

  async updateEventType(
    eventTypeId: number,
    body: Partial<InputEventTransformed_2024_06_14>,
    user: UserWithProfile
  ) {
    if (body.bookingFields) {
      this.checkHasUserAccessibleEmailBookingField(body.bookingFields);
    }
    await this.checkCanUpdateEventType(user.id, eventTypeId, body.scheduleId);
    const eventTypeUser = await this.getUserToUpdateEvent(user);

    await updateEventType({
      input: { id: eventTypeId, ...body },
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

    return {
      ownerId: user.id,
      ...eventType,
    };
  }

  async checkCanUpdateEventType(userId: number, eventTypeId: number, scheduleId: number | undefined | null) {
    const existingEventType = await this.getUserEventType(userId, eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
    this.checkUserOwnsEventType(userId, { id: eventTypeId, userId: existingEventType.ownerId });
    await this.checkUserOwnsSchedule(userId, scheduleId);
  }

  async getUserToUpdateEvent(user: UserWithProfile) {
    const profileId = this.usersService.getUserMainProfile(user)?.id || null;
    const selectedCalendars = await this.selectedCalendarsRepository.getUserSelectedCalendars(user.id);
    const eventTypeSelectedCalendars =
      await this.selectedCalendarsRepository.getUserEventTypeSelectedCalendar(user.id);
    return {
      ...user,
      locale: user.locale ?? "en",
      profile: { id: profileId },
      userLevelSelectedCalendars: selectedCalendars,
      allSelectedCalendars: [...eventTypeSelectedCalendars, ...selectedCalendars],
    };
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
