import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/constants/constants";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { UpdateEventTypeInput } from "@/ee/event-types/inputs/update-event-type.input";
import { InputEventTypesService } from "@/ee/event-types/services/input-event-types.service";
import { OutputEventTypesService } from "@/ee/event-types/services/output-event-types.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { createEventType, slugify, updateEventType } from "@calcom/platform-libraries";
import { getEventTypesPublic, EventTypesPublic } from "@calcom/platform-libraries";
import { CreateEventTypeInput } from "@calcom/platform-types";
import { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository,
    private readonly inputEventTypesService: InputEventTypesService,
    private readonly outputEventTypesService: OutputEventTypesService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async createUserEventType(user: UserWithProfile, body: CreateEventTypeInput) {
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

  async checkCanCreateEventType(userId: number, body: CreateEventTypeInput) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(
      userId,
      slugify(body.title)
    );
    if (existsWithSlug) {
      throw new BadRequestException("User already has an event type with this slug.");
    }
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

    return eventTypes.map((eventType) =>
      this.outputEventTypesService.getResponseEventType(userId, eventType)
    );
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

  async updateEventType(eventTypeId: number, body: UpdateEventTypeInput, user: UserWithProfile) {
    this.checkCanUpdateEventType(user.id, eventTypeId);
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

    return this.outputEventTypesService.getResponseEventType(user.id, eventType);
  }

  async checkCanUpdateEventType(userId: number, eventTypeId: number) {
    const existingEventType = await this.getUserEventType(userId, eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
    this.checkUserOwnsEventType(userId, { id: eventTypeId, userId: existingEventType.ownerId });
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
}
