import { GOOGLE_CALENDAR_TYPE, GOOGLE_MEET_TYPE } from "@calcom/platform-constants";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";

@Injectable()
export class GoogleMeetService {
  private logger = new Logger("GoogleMeetService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly credentialsRepository: CredentialsRepository
  ) {}

  async connectGoogleMeetToUser(userId: number) {
    await this.validateGoogleCalendarConnection(userId, "user");

    const googleMeetExists = await this.conferencingRepository.findGoogleMeet(userId);
    if (googleMeetExists) {
      throw new BadRequestException("Google Meet is already connected for this user.");
    }

    return this.credentialsRepository.upsertUserAppCredential(GOOGLE_MEET_TYPE, {}, userId);
  }

  async connectGoogleMeetToTeam(teamId: number) {
    await this.validateGoogleCalendarConnection(teamId, "team");

    const googleMeetExists = await this.credentialsRepository.findCredentialByTypeAndTeamId(
      GOOGLE_MEET_TYPE,
      teamId
    );
    if (googleMeetExists) {
      throw new BadRequestException("Google Meet is already connected for this team.");
    }

    return this.credentialsRepository.upsertTeamAppCredential(GOOGLE_MEET_TYPE, {}, teamId);
  }

  /**
   * Validate that Google Calendar is connected and valid for either a user or a team.
   */
  private async validateGoogleCalendarConnection(id: number, entity: "user" | "team") {
    const googleCalendar =
      entity === "user"
        ? await this.credentialsRepository.findCredentialByTypeAndUserId(GOOGLE_CALENDAR_TYPE, id)
        : await this.credentialsRepository.findCredentialByTypeAndTeamId(GOOGLE_CALENDAR_TYPE, id);

    if (!googleCalendar) {
      throw new BadRequestException("Google Meet requires a Google Calendar connection.");
    }

    if (googleCalendar.invalid) {
      throw new BadRequestException(
        "Google Meet requires a valid Google Calendar connection. Please reconnect Google Calendar."
      );
    }
  }
}
