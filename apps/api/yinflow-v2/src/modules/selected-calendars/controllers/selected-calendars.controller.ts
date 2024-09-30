import { Body, Controller, Delete, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { CalendarsRepository } from "../../../ee/calendars/calendars.repository";
import { CalendarsService } from "../../../ee/calendars/services/calendars.service";
import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { GetUser } from "../../auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "../../auth/guards/api-auth/api-auth.guard";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "../../selected-calendars/inputs/selected-calendars.input";
import {
  SelectedCalendarOutputDto,
  SelectedCalendarOutputResponseDto,
} from "../../selected-calendars/outputs/selected-calendars.output";
import { SelectedCalendarsRepository } from "../../selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "../../users/users.repository";

@Controller({
  path: "/v2/selected-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Selected-Calendars")
export class SelectedCalendarsController {
  constructor(
    private readonly calendarsRepository: CalendarsRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly calendarsService: CalendarsService
  ) {}

  @Post("/")
  @UseGuards(ApiAuthGuard)
  async addSelectedCalendar(
    @Body() input: SelectedCalendarsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId } = input;
    await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);

    const newlyAddedCalendarEntry = await this.selectedCalendarsRepository.addUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      credentialId
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(SelectedCalendarOutputDto, newlyAddedCalendarEntry, { strategy: "excludeAll" }),
    };
  }

  @Delete("/")
  @UseGuards(ApiAuthGuard)
  async removeSelectedCalendar(
    @Query() queryParams: SelectedCalendarsQueryParamsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId } = queryParams;
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
