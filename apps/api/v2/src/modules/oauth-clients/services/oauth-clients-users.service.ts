import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { createNewUsersConnectToOrgIfExists } from "@calcom/platform-libraries";

@Injectable()
export class OAuthClientUsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService
  ) {}

  async createOauthClientUser(
    oAuthClientId: string,
    body: CreateManagedUserInput,
    isPlatformManaged: boolean,
    organizationId?: number
  ) {
    let user: User;
    if (!organizationId) {
      throw new BadRequestException("You cannot create a managed user outside of an organization");
    } else {
      const [username, emailDomain] = body.email.split("@");
      const email = `${username}+${oAuthClientId}@${emailDomain}`;
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
    }

    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      user.id
    );
    await this.eventTypesService.createUserDefaultEventTypes(user.id);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
