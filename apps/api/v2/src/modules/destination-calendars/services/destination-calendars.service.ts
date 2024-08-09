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
    const allCalendars = userCalendars.connectedCalendars.map((cal) => cal.calendars ?? []).flat();
    const credentialId = allCalendars.find(
      (cal) => cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
    )?.credentialId;

    if (!credentialId) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const primaryEmail =
      allCalendars.find((cal) => cal.primary && cal.credentialId === credentialId)?.email ?? null;

    const {
      id,
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
    } = await this.destinationCalendarsRepository.updateCalendar(
      integration,
      externalId,
      credentialId,
      userId,
      primaryEmail
    );

    return {
      userId: id,
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
    };
  }
}
