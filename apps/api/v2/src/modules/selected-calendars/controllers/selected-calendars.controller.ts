import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Body, Controller, Delete, Post, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "@/modules/selected-calendars/inputs/selected-calendars.input";
import {
  SelectedCalendarOutputDto,
  SelectedCalendarOutputResponseDto,
} from "@/modules/selected-calendars/outputs/selected-calendars.output";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selected-calendars.service";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/selected-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Selected Calendars")
@UseGuards(ApiAuthGuard)
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class SelectedCalendarsController {
  constructor(private readonly selectedCalendarsService: SelectedCalendarsService) {}

  @Post("/")
  @ApiOperation({ summary: "Add a selected calendar" })
  async addSelectedCalendar(
    @Body() input: SelectedCalendarsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const selectedCalendar = await this.selectedCalendarsService.addSelectedCalendar(user, input);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(SelectedCalendarOutputDto, selectedCalendar, { strategy: "excludeAll" }),
    };
  }

  @Delete("/")
  @ApiOperation({ summary: "Delete a selected calendar" })
  async deleteSelectedCalendar(
    @Query() queryParams: SelectedCalendarsQueryParamsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const removedCalendarEntry = await this.selectedCalendarsService.deleteSelectedCalendar(
      queryParams,
      user
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(SelectedCalendarOutputDto, removedCalendarEntry, { strategy: "excludeAll" }),
    };
  }
}
