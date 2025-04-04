import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { DestinationCalendarsInputBodyDto } from "@/modules/destination-calendars/inputs/destination-calendars.input";
import {
  DestinationCalendarsOutputDto,
  DestinationCalendarsOutputResponseDto,
} from "@/modules/destination-calendars/outputs/destination-calendars.output";
import { DestinationCalendarsService } from "@/modules/destination-calendars/services/destination-calendars.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Body, Controller, Put, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/destination-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Destination Calendars")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
@UseGuards(ApiAuthGuard)
export class DestinationCalendarsController {
  constructor(private readonly destinationCalendarsService: DestinationCalendarsService) {}

  @Put("/")
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
