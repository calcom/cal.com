import { EventTypesService_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/services/event-types.service";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries-0.0.22";

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
    const existsWithEmail = await this.managedUserExistsWithEmail(oAuthClientId, body.email);
    if (existsWithEmail) {
      throw new BadRequestException("User with the provided e-mail already exists.");
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
        name: body.name ?? user.username ?? undefined,
        locale: body.locale,
      });
      user.locale = updatedUser.locale;
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

    await this.organizationsTeamsService.addUserToPlatformTeamEvents(user.id, organizationId, oAuthClientId);

    return {
      user,
      tokens: {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
      },
    };
  }

  async managedUserExistsWithEmail(oAuthClientId: string, email: string) {
    const oAuthEmail = this.getOAuthUserEmail(oAuthClientId, email);
    const user = await this.userRepository.findByEmail(oAuthEmail);
    return !!user;
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
