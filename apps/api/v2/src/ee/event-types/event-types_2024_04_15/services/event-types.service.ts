import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/event-types_2024_04_15/constants/constants";
import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { Editable } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/editable";
import { BaseField } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/field-type";
import { UpdateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/update-event-type.input";
import { EventTypeOutput } from "@/ee/event-types/event-types_2024_04_15/outputs/event-type.output";
import { systemBeforeFieldEmail } from "@/ee/event-types/event-types_2024_06_14/transformers";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
  createEventType,
  updateEventType,
  EventTypesPublic,
  getEventTypesPublic,
} from "@calcom/platform-libraries/event-types";
import type { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService_2024_04_15 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_04_15,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly dbWrite: PrismaWriteService,
    private usersService: UsersService
  ) {}

  async createUserEventType(
    user: UserWithProfile,
    body: CreateEventTypeInput_2024_04_15
  ): Promise<EventTypeOutput> {
    await this.checkCanCreateEventType(user.id, body);
    const eventTypeUser = await this.getUserToCreateEvent(user);
    const { eventType } = await createEventType({
      input: body,
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });
    return eventType as EventTypeOutput;
  }

  async checkCanCreateEventType(userId: number, body: CreateEventTypeInput_2024_04_15) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(userId, body.slug);
    if (existsWithSlug) {
      throw new BadRequestException("User already has an event type with this slug.");
    }
  }

  async getUserToCreateEvent(user: UserWithProfile) {
    const organizationId = this.usersService.getUserMainOrgId(user);
    const isOrgAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;
    const profileId = this.usersService.getUserMainProfile(user)?.id || null;
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId },
      metadata: user.metadata,
      email: user.email,
    };
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    const eventType = await this.eventTypesRepository.getUserEventType(userId, eventTypeId);

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(userId, eventType);
    return eventType;
  }

  async getUserEventTypeForAtom(user: UserWithProfile, eventTypeId: number) {
    const organizationId = this.usersService.getUserMainOrgId(user);

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
    return eventType as { eventType: EventTypeOutput };
  }

  async getEventTypesPublicByUsername(username: string): Promise<EventTypesPublic> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return await getEventTypesPublic(user.id);
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

  async updateEventType(eventTypeId: number, body: UpdateEventTypeInput_2024_04_15, user: UserWithProfile) {
    await this.checkCanUpdateEventType(user.id, eventTypeId);
    const eventTypeUser = await this.getUserToUpdateEvent(user);
    const bookingFields = [...(body.bookingFields || [])];

    if (
      !bookingFields.find((field) => field.type === "email") &&
      !bookingFields.find((field) => field.type === "phone")
    ) {
      bookingFields.push({
        ...systemBeforeFieldEmail,
        type: BaseField.email,
        editable: Editable.systemButOptional,
      });
    }

    await updateEventType({
      input: { id: eventTypeId, ...body, bookingFields },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.getUserEventTypeForAtom(user, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async checkCanUpdateEventType(userId: number, eventTypeId: number) {
    const existingEventType = await this.getUserEventType(userId, eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
    this.checkUserOwnsEventType(userId, existingEventType);
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
}
