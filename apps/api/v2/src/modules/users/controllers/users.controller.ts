import { GetEventTypeOutput } from "@/ee/event-types/outputs/get-event-type.output";
import { GetEventTypesOutput } from "@/ee/event-types/outputs/get-event-types.output";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { GetUsersOutput } from "@/modules/users/outputs/get-users.output";
import { UsersService } from "@/modules/users/services/users.service";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "users",
  version: "2",
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventTypesService: EventTypesService
  ) {}

  @DocsTags("Event types")
  @Get("/:username/event-types")
  async getEventTypes(@Param("username") username: string): Promise<GetEventTypesOutput> {
    const eventTypes = await this.eventTypesService.getEventTypesByUsername(username);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @DocsTags("Event types")
  @Get("/:username/event-types/:eventSlug")
  async getEventType(
    @Param("username") username: string,
    @Param("eventSlug") eventSlug: string
  ): Promise<GetEventTypeOutput> {
    const eventType = await this.eventTypesService.getEventTypeByUsernameAndSlug(username, eventSlug);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/")
  async getUsersByUsernames(@Query("usernames") usernames: string): Promise<GetUsersOutput> {
    if (usernames) {
      const users = await this.usersService.getByUsernames(usernames);

      return {
        status: SUCCESS_STATUS,
        data: users,
      };
    }

    return {
      status: SUCCESS_STATUS,
      data: [],
    };
  }
}
