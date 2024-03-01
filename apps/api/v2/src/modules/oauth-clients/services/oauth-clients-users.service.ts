import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OAuthClientUsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService
  ) {}

  async createOauthClientUser(oAuthClientId: string, body: CreateUserInput, username: string) {
    const user = await this.userRepository.create(body, username, oAuthClientId);
    await this.eventTypesService.createUserDefaultEventTypes(user.id);

    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      user.id
    );

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
