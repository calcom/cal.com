import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { PlatformOAuthClient } from "@calcom/prisma/client";

@Injectable()
export class PlatformBookingsService {
  constructor(
    private readonly oAuthClientsUsersService: OAuthClientUsersService,
    private readonly usersRepository: UsersRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly oAuthClientRepository: OAuthClientRepository
  ) {}

  async getPlatformAttendeesEmails(guestsEmails: string[], platformClientId: string) {
    return Promise.all(
      guestsEmails.map((guestEmail) => this.getPlatformAttendeeEmail(guestEmail, platformClientId))
    );
  }

  async getPlatformAttendeeEmail(attendeeEmail: string, platformClientId: string) {
    if (!attendeeEmail.includes(platformClientId)) {
      // note(Lauris): we need to do this when managed user is booking another managed user and the managed user doing the booking entered their email without oAuth client id
      // or if one of the guests added are managed users without oAuth client id in their email.
      const oAuthUserEmail = this.oAuthClientsUsersService.getOAuthUserEmail(platformClientId, attendeeEmail);
      const oAuthUser = await this.usersRepository.findByEmail(oAuthUserEmail);
      if (oAuthUser) {
        return oAuthUserEmail;
      }
    }
    return attendeeEmail;
  }

  async getOAuthClientParams(eventTypeId: number) {
    const eventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);

    let oAuthClient: PlatformOAuthClient | null = null;
    if (eventType?.userId) {
      oAuthClient = await this.oAuthClientRepository.getByUserId(eventType.userId);
    } else if (eventType?.teamId) {
      oAuthClient = await this.oAuthClientRepository.getByTeamId(eventType.teamId);
    }

    if (oAuthClient) {
      return {
        platformClientId: oAuthClient.id,
        platformCancelUrl: oAuthClient.bookingCancelRedirectUri,
        platformRescheduleUrl: oAuthClient.bookingRescheduleRedirectUri,
        platformBookingUrl: oAuthClient.bookingRedirectUri,
        arePlatformEmailsEnabled: oAuthClient.areEmailsEnabled,
      };
    }

    return undefined;
  }
}
