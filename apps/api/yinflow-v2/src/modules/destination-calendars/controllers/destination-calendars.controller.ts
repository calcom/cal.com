import { Body, Controller, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { GetUser } from "../../auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "../../auth/guards/api-auth/api-auth.guard";
import { DestinationCalendarsInputBodyDto } from "../../destination-calendars/inputs/destination-calendars.input";
import {
  DestinationCalendarsOutputDto,
  DestinationCalendarsOutputResponseDto,
} from "../../destination-calendars/outputs/destination-calendars.output";
import { DestinationCalendarsService } from "../../destination-calendars/services/destination-calendars.service";
import { UserWithProfile } from "../../users/users.repository";

@Controller({
  path: "/v2/destination-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Destination Calendars")
export class DestinationCalendarsController {
  constructor(private readonly destinationCalendarsService: DestinationCalendarsService) {}

  @Put("/")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Update destination calendars" })
  async updateDestinationCalendars(
    @Body() input: DestinationCalendarsInputBodyDto,
    @GetUser() user: UserWithProfile
  ): Promise<DestinationCalendarsOutputResponseDto> {
    const { integration, externalId, delegationCredentialId } = input;
    const updatedDestinationCalendar = await this.destinationCalendarsService.updateDestinationCalendars(
      integration,
      externalId,
      user.id,
      delegationCredentialId
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DestinationCalendarsOutputDto, updatedDestinationCalendar, {
        strategy: "excludeAll",
      }),
    };
  }
}
