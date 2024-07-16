import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { SelectedCalendarsInputDto } from "@/modules/selected-calendars/controllers/inputs/selected-calendars.input";
import { SelectedCalendarOutputResponseDto } from "@/modules/selected-calendars/controllers/outputs/selected-calendars.output";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Body, Controller, Post, UseGuards, Delete, NotFoundException } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/selected-calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Selected-Calendars")
export class selectedCalendarsController {
  constructor(
    private readonly calendarsRepository: CalendarsRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository
  ) {}

  @Post("/")
  @UseGuards(ApiAuthGuard)
  async addSelectedCalendar(
    @Body() input: SelectedCalendarsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId } = input;
    const credential = await this.calendarsRepository.getCalendarCredentials(credentialId, user.id);
    if (!credential) {
      throw new NotFoundException(`Credentials not found`);
    }

    const newlyAddedCalendar = await this.selectedCalendarsRepository.addUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      credentialId
    );

    return {
      status: SUCCESS_STATUS,
      data: { ...newlyAddedCalendar },
    };
  }

  @Delete("/")
  @UseGuards(ApiAuthGuard)
  async removeSelectedCalendar(
    @Body() input: SelectedCalendarsInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<SelectedCalendarOutputResponseDto> {
    const { integration, externalId, credentialId } = input;
    const credential = await this.calendarsRepository.getCalendarCredentials(credentialId, user.id);
    if (!credential) {
      throw new NotFoundException(`Credentials not found`);
    }

    const removedCalendarEntry = await this.selectedCalendarsRepository.removeUserSelectedCalendar(
      user.id,
      integration,
      externalId
    );

    return {
      status: SUCCESS_STATUS,
      data: { ...removedCalendarEntry },
    };
  }
}
