import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PlatformBookingsService {
  constructor(
    private readonly oAuthClientsUsersService: OAuthClientUsersService,
    private readonly usersRepository: UsersRepository
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
}
