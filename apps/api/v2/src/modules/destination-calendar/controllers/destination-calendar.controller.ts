import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { DestinationCalendarInputBodyDto } from "@/modules/destination-calendar/inputs/destination-calendar.input";
import {
  DestinationCalendarOutputDto,
  DestinationCalendarOutputResponseDto,
} from "@/modules/destination-calendar/outputs/destination-calendar.output";
import { DestinationCalendarService } from "@/modules/destination-calendar/services/destination-calendar.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/destination-calendar",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Destination-Calendar")
export class DestinationCalendarController {
  constructor(private readonly destinationCalendarService: DestinationCalendarService) {}

  @Post("/")
  @UseGuards(ApiAuthGuard)
  async updateDestinationCalendar(
    @Body() input: DestinationCalendarInputBodyDto,
    @GetUser() user: UserWithProfile
  ): Promise<DestinationCalendarOutputResponseDto> {
    const { integration, externalId } = input;
    const updatedDestinationCalendar = await this.destinationCalendarService.updateDestinationCalendar(
      integration,
      externalId,
      user.id
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DestinationCalendarOutputDto, updatedDestinationCalendar, {
        strategy: "excludeAll",
      }),
    };
  }
}
