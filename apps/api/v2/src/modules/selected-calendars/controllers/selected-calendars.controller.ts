import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "@/modules/selected-calendars/inputs/selected-calendars.input";
import {
  SelectedCalendarOutputResponseDto,
  SelectedCalendarOutputDto,
} from "@/modules/selected-calendars/outputs/selected-calendars.output";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Body, Controller, Post, UseGuards, Delete, Query } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SelectedCalendarRepository } from "@calcom/platform-libraries";

@Controller({
  path: "/v2/selected-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Selected Calendars")
export class SelectedCalendarsController {
  constructor(
    private readonly calendarsRepository: CalendarsRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly calendarsService: CalendarsService
  ) {}

  @Post("/")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Add a selected calendar" })
  async addSelectedCalendar(
    @Body() input: SelectedCalendarsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId, domainWideDelegationCredentialId } = input;
    const data = await SelectedCalendarRepository.upsert({
      userId: user.id,
      integration,
      externalId,
      credentialId,
      domainWideDelegationCredentialId,
      eventTypeId: null,
    });

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(SelectedCalendarOutputDto, data, { strategy: "excludeAll" }),
    };
  }

  @Delete("/")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Delete a selected calendar" })
  async removeSelectedCalendar(
    @Query() queryParams: SelectedCalendarsQueryParamsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId, domainWideDelegationCredentialId } = queryParams;
    await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);

    const removedCalendarEntry = await this.selectedCalendarsRepository.removeUserSelectedCalendar(
      user.id,
      integration,
      externalId
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(SelectedCalendarOutputDto, removedCalendarEntry, { strategy: "excludeAll" }),
    };
  }
}
