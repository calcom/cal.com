import { ConnectedCalendar, Calendar } from "@/ee/calendars/outputs/connected-calendars.output";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { DestinationCalendarsRepository } from "@/modules/destination-calendars/destination-calendars.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DestinationCalendarsService {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly destinationCalendarsRepository: DestinationCalendarsRepository
  ) {}

  async updateDestinationCalendars(integration: string, externalId: string, userId: number) {
    const userCalendars = await this.calendarsService.getCalendars(userId);
    const allCalendars = userCalendars.connectedCalendars
      .map((cal: ConnectedCalendar) => cal.calendars ?? [])
      .flat();
    const credentialId = allCalendars.find(
      (cal: Calendar) =>
        cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
    )?.credentialId;

    if (!credentialId) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const primaryEmail =
      allCalendars.find((cal: Calendar) => cal.primary && cal.credentialId === credentialId)?.email ?? null;

    const {
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
      userId: updatedCalendarUserId,
    } = await this.destinationCalendarsRepository.updateCalendar(
      integration,
      externalId,
      credentialId,
      userId,
      primaryEmail
    );

    return {
      userId: updatedCalendarUserId,
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
    };
  }
}
