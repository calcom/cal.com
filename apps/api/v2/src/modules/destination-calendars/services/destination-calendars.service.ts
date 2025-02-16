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

  async updateDestinationCalendars(
    integration: string,
    externalId: string,
    userId: number,
    domainWideDelegationCredentialId?: string
  ) {
    // note(Lauris): todo remove the log but leaving this now to confirm domainWideDelegationCredentialId is received
    console.log("debug: domainWideDelegationCredentialId", domainWideDelegationCredentialId);
    const userCalendars = await this.calendarsService.getCalendars(userId);
    const allCalendars: Calendar[] = userCalendars.connectedCalendars
      .map((cal: ConnectedCalendar) => cal.calendars ?? [])
      .flat();
    const credentialId = allCalendars.find(
      (cal: Calendar) =>
        cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
    )?.credentialId;

    if (!domainWideDelegationCredentialId && !credentialId) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const dwdCalendar = domainWideDelegationCredentialId
      ? allCalendars.find(
          (cal: Calendar) =>
            cal.externalId === externalId &&
            cal.integration === integration &&
            cal.domainWideDelegationCredentialId === domainWideDelegationCredentialId
        )
      : undefined;

    if (domainWideDelegationCredentialId && !dwdCalendar) {
      throw new NotFoundException(`Could not find calendar ${externalId}`);
    }

    const primaryEmail = dwdCalendar
      ? (dwdCalendar.primary && dwdCalendar?.email) || undefined
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
      dwdCalendar ? undefined : credentialId,
      dwdCalendar ? domainWideDelegationCredentialId : undefined
    );

    return {
      userId: updatedCalendarUserId,
      integration: updatedCalendarIntegration,
      externalId: updatedCalendarExternalId,
      credentialId: updatedCalendarCredentialId,
    };
  }
}
