import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.respository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { BadRequestException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { GOOGLE_CALENDAR_TYPE, GOOGLE_MEET_TYPE } from "@calcom/platform-constants";

@Injectable()
export class GoogleMeetService {
  private logger = new Logger("GoogleMeetService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly credentialRepository: CredentialsRepository
  ) {}

  async connectGoogleMeetApp(userId: number) {
    const googleCalendar = await this.credentialRepository.getByTypeAndUserId(GOOGLE_CALENDAR_TYPE, userId);

    if (!googleCalendar) {
      throw new BadRequestException("Google Meet app requires a Google Calendar connection");
    }

    if (googleCalendar.invalid) {
      throw new BadRequestException(
        "Google Meet app requires a valid Google Calendar connection, please reconnect Google Calendar."
      );
    }

    const googleMeet = await this.conferencingRepository.findGoogleMeet(userId);

    if (googleMeet) {
      throw new BadRequestException("Google Meet is already connected.");
    }

    const googleMeetCredential = await this.credentialRepository.upsertAppCredential(
      GOOGLE_MEET_TYPE,
      {},
      userId
    );

    return googleMeetCredential;
  }

  async disconnectGoogleMeetApp(userId: number) {
    const googleMeet = await this.conferencingRepository.findGoogleMeet(userId);

    if (!googleMeet) {
      throw new BadRequestException("Google Meet is not connected.");
    }

    const googleMeetCredential = await this.credentialRepository.deleteUserCredentialById(
      userId,
      googleMeet.id
    );

    return googleMeetCredential;
  }
}
