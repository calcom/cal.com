import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

@Injectable()
export class OAuthClientGuard implements CanActivate {
  constructor(private readonly oauthRepository: OAuthClientRepository) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers } = request;

    const oauthClientId = headers[X_CAL_CLIENT_ID];
    const oauthClientSecret = headers[X_CAL_SECRET_KEY];

    return this.validateOauthClient(oauthClientId, oauthClientSecret);
  }

  private async validateOauthClient(oauthClientId: string, oauthClientSecret: string): Promise<boolean> {
    const oauthClient = await this.oauthRepository.getOAuthClient(oauthClientId);

    if (!oauthClient || oauthClient.secret !== oauthClientSecret) {
      return false;
    }

    return true;
  }
}
