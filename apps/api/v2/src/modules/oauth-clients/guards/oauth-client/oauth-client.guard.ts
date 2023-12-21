import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private readonly oauthRepository: OAuthClientRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers, params } = request;

    const oauthClientId = params.clientId;
    const oauthClientSecret = headers[X_CAL_SECRET_KEY];

    if (!oauthClientId) {
      throw new UnauthorizedException("Missing client ID");
    }

    if (!oauthClientSecret) {
      throw new UnauthorizedException("Missing client secret");
    }

    const client = await this.oauthRepository.getOAuthClient(oauthClientId);

    if (!client || client.secret !== oauthClientSecret) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
