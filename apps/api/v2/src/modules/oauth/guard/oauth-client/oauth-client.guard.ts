import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PlatformOAuthClient } from "@prisma/client";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

export type AuthenticatedRequest = Request & {
  oAuthClient: PlatformOAuthClient;
};

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private readonly oauthRepository: OAuthClientRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers } = request;

    const oauthClientId = headers[X_CAL_CLIENT_ID];
    const oauthClientSecret = headers[X_CAL_SECRET_KEY];

    const valid = this.validateOauthClient(oauthClientId, oauthClientSecret);

    if (!valid) {
      throw new UnauthorizedException();
    }

    const client = await this.oauthRepository.getOAuthClient(oauthClientId);

    if (!client) {
      throw new NotFoundException();
    }

    request.oAuthClient = client;

    return valid;
  }

  private async validateOauthClient(oauthClientId: string, oauthClientSecret: string): Promise<boolean> {
    if (!oauthClientId || !oauthClientSecret) {
      return false;
    }

    const oauthClient = await this.oauthRepository.getOAuthClient(oauthClientId);

    if (!oauthClient || oauthClient.secret !== oauthClientSecret) {
      return false;
    }

    return true;
  }
}
