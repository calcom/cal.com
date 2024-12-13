import { EventTypesService_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/services/event-types.service";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries";

@Injectable()
export class OAuthClientUsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService_2024_04_15,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly organizationsTeamsService: OrganizationsTeamsService
  ) {}

  async createOauthClientUser(
    oAuthClientId: string,
    body: CreateManagedUserInput,
    isPlatformManaged: boolean,
    organizationId?: number
  ) {
    const existingUser = await this.getExistingUserByEmail(oAuthClientId, body.email);
    if (existingUser) {
      throw new ConflictException(
        `User with the provided e-mail already exists. Existing user ID=${existingUser.id}`
      );
    }

    let user: User;
    if (!organizationId) {
      throw new BadRequestException("You cannot create a managed user outside of an organization");
    } else {
      const email = this.getOAuthUserEmail(oAuthClientId, body.email);
      user = (
        await createNewUsersConnectToOrgIfExists({
          invitations: [
            {
              usernameOrEmail: email,
              role: "MEMBER",
            },
          ],
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
          isPlatformManaged,
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

    await this.eventTypesService.createUserDefaultEventTypes(user.id);

    if (body.timeZone) {
      const defaultSchedule = await this.schedulesService.createUserDefaultSchedule(user.id, body.timeZone);
      user.defaultScheduleId = defaultSchedule.id;
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
    const oAuthEmail = this.getOAuthUserEmail(oAuthClientId, email);
    return await this.userRepository.findByEmail(oAuthEmail);
  }

  async updateOAuthClientUser(oAuthClientId: string, userId: number, body: UpdateManagedUserInput) {
    if (body.email) {
      const emailWithOAuthId = this.getOAuthUserEmail(oAuthClientId, body.email);
      body.email = emailWithOAuthId;
      const newUsername = slugify(emailWithOAuthId);
      await this.userRepository.updateUsername(userId, newUsername);
    }

    return this.userRepository.update(userId, body);
  }

  getOAuthUserEmail(oAuthClientId: string, userEmail: string) {
    const [username, emailDomain] = userEmail.split("@");
    return `${username}+${oAuthClientId}@${emailDomain}`;
  }
}
