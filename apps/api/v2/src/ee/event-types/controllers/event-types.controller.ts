import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { UpdateEventTypeInput } from "@/ee/event-types/inputs/update-event-type.input";
import { CreateEventTypeOutput } from "@/ee/event-types/outputs/create-event-type.output";
import { DeleteEventTypeOutput } from "@/ee/event-types/outputs/delete-event-type.output";
import { GetEventTypeOutput } from "@/ee/event-types/outputs/get-event-type.output";
import { GetEventTypesPublicOutput } from "@/ee/event-types/outputs/get-event-types-public.output";
import { GetEventTypesOutput } from "@/ee/event-types/outputs/get-event-types.output";
import { UpdateEventTypeOutput } from "@/ee/event-types/outputs/update-event-type.output";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  Post,
  Body,
  NotFoundException,
  Patch,
  HttpCode,
  HttpStatus,
  Delete,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { getEventTypesByViewer } from "@calcom/platform-libraries";

@Controller({
  path: "event-types",
  version: "2",
})
@UseGuards(PermissionsGuard)
@DocsTags("Event types")
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  async createEventType(
    @Body() body: CreateEventTypeInput,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput> {
    const eventType = await this.eventTypesService.createUserEventType(user, body);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/:eventTypeId")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(AccessTokenGuard)
  async getEventType(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser() user: UserWithProfile
  ): Promise<GetEventTypeOutput> {
    const eventType = await this.eventTypesService.getUserEventTypeForAtom(user, Number(eventTypeId));

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(AccessTokenGuard)
  async getEventTypes(@GetUser() user: UserWithProfile): Promise<GetEventTypesOutput> {
    const eventTypes = await getEventTypesByViewer({
      id: user.id,
      profile: {
        upId: `usr-${user.id}`,
      },
    });

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Get("/:username/public")
  async getPublicEventTypes(@Param("username") username: string): Promise<GetEventTypesPublicOutput> {
    const eventTypes = await this.eventTypesService.getEventTypesPublicByUsername(username);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Patch("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async updateEventType(
    @Param("eventTypeId") eventTypeId: number,
    @Body() body: UpdateEventTypeInput,
    @GetUser() user: UserWithProfile
  ): Promise<UpdateEventTypeOutput> {
    const eventType = await this.eventTypesService.updateEventType(eventTypeId, body, user);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Delete("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  async deleteEventType(
    @Param("eventTypeId") eventTypeId: number,
    @GetUser("id") userId: number
  ): Promise<DeleteEventTypeOutput> {
    const eventType = await this.eventTypesService.deleteEventType(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: eventType.id,
        length: eventType.length,
        slug: eventType.slug,
        title: eventType.title,
      },
    };
  }
}
