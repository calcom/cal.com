import { Injectable, NotFoundException } from "@nestjs/common";
import { Calendar, ConnectedCalendar } from "@/ee/calendars/outputs/connected-calendars.output";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { DestinationCalendarsRepository } from "@/modules/destination-calendars/destination-calendars.repository";

@Injectable()
export class DestinationCalendarsService {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly calendarsCacheService: CalendarsCacheService,
    private readonly destinationCalendarsRepository: DestinationCalendarsRepository
  ) {}

  async updateDestinationCalendars(
    integration: string,
    externalId: string,
    userId: number,
    delegationCredentialId?: string
  ) {
    const userCalendars = await this.calendarsService.getCalendars(userId);
    const allCalendars: Calendar[] = userCalendars.connectedCalendars.flatMap(
      (cal: ConnectedCalendar) => cal.calendars ?? []
    );
    const credentialId = allCalendars.find(
      (cal: Calendar) =>
        cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
    )?.credentialId;

    if (!delegationCredentialId && !credentialId) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const delegatedCalendar = delegationCredentialId
      ? allCalendars.find(
          (cal: Calendar) =>
            cal.externalId === externalId &&
            cal.integration === integration &&
            cal.delegationCredentialId === delegationCredentialId
        )
      : undefined;

    if (delegationCredentialId && !delegatedCalendar) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const primaryEmail = delegatedCalendar
      ? (delegatedCalendar.primary && delegatedCalendar?.email) || undefined
      : allCalendars.find((cal: Calendar) => cal.primary && cal.credentialId === credentialId)?.email;

    const {
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
      userId: updatedCalendarUserId,
    } = await this.destinationCalendarsRepository.updateCalendar(
      integration,
      externalId,
      userId,
      primaryEmail ?? null,
      delegatedCalendar ? undefined : credentialId,
      delegatedCalendar ? delegationCredentialId : undefined
    );

    this.calendarsCacheService.deleteConnectedAndDestinationCalendarsCache(userId);
    return {
      userId: updatedCalendarUserId,
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
    };
  }
}
