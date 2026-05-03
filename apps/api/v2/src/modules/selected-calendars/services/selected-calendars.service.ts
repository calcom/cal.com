import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "@/modules/selected-calendars/inputs/selected-calendars.input";
import {
  MULTIPLE_SELECTED_CALENDARS_FOUND,
  NO_SELECTED_CALENDAR_FOUND,
  SelectedCalendarsRepository,
} from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "@/modules/users/users.repository";

@Injectable()
export class SelectedCalendarsService {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly calendarsCacheService: CalendarsCacheService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository
  ) {}

  async addSelectedCalendar(user: UserWithProfile, input: SelectedCalendarsInputDto) {
    const { integration, externalId, credentialId } = input;
    await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);

    const userSelectedCalendar = await this.selectedCalendarsRepository.addUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      credentialId
    );

    await this.calendarsCacheService.deleteConnectedAndDestinationCalendarsCache(user.id);

    return userSelectedCalendar;
  }

  async deleteSelectedCalendar(
    selectedCalendar: SelectedCalendarsQueryParamsInputDto,
    user: UserWithProfile
  ) {
    const { integration, externalId, credentialId } = selectedCalendar;
    await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);

    try {
      const removedCalendarEntry = await this.selectedCalendarsRepository.removeUserSelectedCalendar(
        user.id,
        integration,
        externalId,
        undefined
      );
      await this.calendarsCacheService.deleteConnectedAndDestinationCalendarsCache(user.id);
      return removedCalendarEntry;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === NO_SELECTED_CALENDAR_FOUND) {
          throw new NotFoundException(NO_SELECTED_CALENDAR_FOUND);
        } else if (error.message === MULTIPLE_SELECTED_CALENDARS_FOUND) {
          throw new BadRequestException(MULTIPLE_SELECTED_CALENDARS_FOUND);
        }
      }
    }
  }
}
