import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries";

@Injectable()
export class OAuthClientUsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService,
    private readonly schedulesService: SchedulesService
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
          usernamesOrEmails: [email],
          input: {
            teamId: organizationId,
            role: "MEMBER",
            usernameOrEmail: [email],
            isOrg: true,
            language: "en",
          },
          parentId: null,
          autoAcceptEmailDomain: "never-auto-accept-email-domain-for-managed-users",
          connectionInfoMap: {
            [email]: {
              orgId: organizationId,
              autoAccept: true,
            },
          },
          isPlatformManaged,
        })
      )[0];
      await this.userRepository.addToOAuthClient(user.id, oAuthClientId);
      await this.userRepository.update(user.id, { name: body.name ?? user.username ?? undefined });
    }

    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
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
