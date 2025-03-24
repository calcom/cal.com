import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { EventTypesService_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/services/event-types.service";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { GetManagedUsersInput } from "@/modules/oauth-clients/controllers/oauth-client-users/inputs/get-managed-users.input";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";
import { User, CreationSource, PlatformOAuthClient } from "@prisma/client";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries";

@Injectable()
export class OAuthClientUsersService {
  private readonly logger = new Logger("OAuthClientUsersService");

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService_2024_04_15,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly calendarsService: CalendarsService
  ) {}

  async createOAuthClientUser(oAuthClient: PlatformOAuthClient, body: CreateManagedUserInput) {
    const oAuthClientId = oAuthClient.id;
    const organizationId = oAuthClient.organizationId;

    const existingUser = await this.getExistingUserByEmail(oAuthClientId, body.email);
    if (existingUser) {
      throw new ConflictException(
        `User with the provided e-mail already exists. Existing user ID=${existingUser.id}`
      );
    }

    let user: User;
    if (!organizationId) {
      throw new BadRequestException(
        "You cannot create a managed user outside of an organization - the OAuth client does not belong to any organization."
      );
    } else {
      const email = OAuthClientUsersService.getOAuthUserEmail(oAuthClientId, body.email);
      user = (
        await createNewUsersConnectToOrgIfExists({
          invitations: [
            {
              usernameOrEmail: email,
              role: "MEMBER",
            },
          ],
          creationSource: CreationSource.API_V2,
          teamId: organizationId,
          isOrg: true,
          parentId: null,
          autoAcceptEmailDomain: "never-auto-accept-email-domain-for-managed-users",
          orgConnectInfoByUsernameOrEmail: {
            [email]: {
              orgId: organizationId,
              autoAccept: true,
            },
          },
          isPlatformManaged: true,
          timeFormat: body.timeFormat,
          weekStart: body.weekStart,
          timeZone: body.timeZone,
        })
      )[0];
      await this.userRepository.addToOAuthClient(user.id, oAuthClientId);
      const updatedUser = await this.userRepository.update(user.id, {
        name: body.name,
        locale: body.locale,
        avatarUrl: body.avatarUrl,
      });
      user.locale = updatedUser.locale;
      user.name = updatedUser.name;
      user.avatarUrl = updatedUser.avatarUrl;
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      user.id
    );

    if (oAuthClient.areDefaultEventTypesEnabled) {
      await this.eventTypesService.createUserDefaultEventTypes(user.id);
    }

    if (body.timeZone) {
      const defaultSchedule = await this.schedulesService.createUserDefaultSchedule(user.id, body.timeZone);
      user.defaultScheduleId = defaultSchedule.id;
    }

    try {
      this.logger.log(`Setting default calendars in db for user with id ${user.id}`);
      await this.calendarsService.getCalendars(user.id);
    } catch (err) {
      this.logger.error(`Could not get calendars of new managed user with id ${user.id}`);
    }

    return {
      user,
      tokens: {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
      },
    };
  }

  async getExistingUserByEmail(oAuthClientId: string, email: string) {
    const oAuthEmail = OAuthClientUsersService.getOAuthUserEmail(oAuthClientId, email);
    return await this.userRepository.findByEmail(oAuthEmail);
  }

  async getManagedUsers(oAuthClientId: string, queryParams: GetManagedUsersInput) {
    const { offset, limit, emails } = queryParams;

    const oAuthEmails = emails?.map((email) =>
      email.includes(oAuthClientId) ? email : OAuthClientUsersService.getOAuthUserEmail(oAuthClientId, email)
    );

    const managedUsers = await this.userRepository.findManagedUsersByOAuthClientIdAndEmails(
      oAuthClientId,
      offset ?? 0,
      limit ?? 50,
      oAuthEmails
    );

    return managedUsers;
  }

  async updateOAuthClientUser(oAuthClientId: string, userId: number, body: UpdateManagedUserInput) {
    if (body.email) {
      const emailWithOAuthId = OAuthClientUsersService.getOAuthUserEmail(oAuthClientId, body.email);
      body.email = emailWithOAuthId;
      const [emailUser, emailDomain] = emailWithOAuthId.split("@");
      const [domainName, TLD] = emailDomain.split(".");
      const newUsername = slugify(`${emailUser}-${domainName}-${TLD}`);
      await this.userRepository.updateUsername(userId, newUsername);
    }

    return this.userRepository.update(userId, body);
  }

  static getOAuthUserEmail(oAuthClientId: string, userEmail: string) {
    const [username, emailDomain] = userEmail.split("@");
    return `${username}+${oAuthClientId}@${emailDomain}`;
  }
}
