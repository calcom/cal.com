import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUsersOutput } from "@/modules/users/outputs/get-users.output";
import { UsersService } from "@/modules/users/services/users.service";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "v2/users",
  version: API_VERSIONS_VALUES,
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventTypesService: EventTypesService_2024_06_14
  ) {}

  @DocsTags("Event types")
  @Get("/:username/event-types")
  async getEventTypes(@Param("username") username: string): Promise<GetEventTypesOutput_2024_06_14> {
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
  ): Promise<GetEventTypeOutput_2024_06_14> {
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
