import { isApiKey } from "@/lib/api-key";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { getToken } from "next-auth/jwt";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { hasPermissions } from "@calcom/platform-utils";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokensRepository: TokensRepository,
    private readonly config: ConfigService,
    private readonly oAuthClientRepository: OAuthClientRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());

    if (!requiredPermissions?.length || !Object.keys(requiredPermissions)?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authString = request.get("Authorization")?.replace("Bearer ", "");
    const nextAuthSecret = this.config.get("next.authSecret", { infer: true });
    const nextAuthToken = await getToken({ req: request, secret: nextAuthSecret });
    const oAuthClientId = request.params?.clientId || request.get(X_CAL_CLIENT_ID);

    if (nextAuthToken) {
      return true;
    }

    if (!authString && !oAuthClientId) {
      return false;
    }

    // only check permissions for accessTokens attached to an oAuth Client
    if (isApiKey(authString, this.config.get("api.apiKeyPrefix") ?? "cal_")) {
      return true;
    }

    const oAuthClientPermissions = authString
      ? await this.getOAuthClientPermissionsByAccessToken(authString)
      : await this.getOAuthClientPermissionsById(oAuthClientId);

    if (!oAuthClientPermissions) {
      return false;
    }

    return hasPermissions(oAuthClientPermissions, [...requiredPermissions]);
  }

  async getOAuthClientPermissionsByAccessToken(accessToken: string) {
    const oAuthClient = await this.tokensRepository.getAccessTokenClient(accessToken);
    return oAuthClient?.permissions;
  }

  async getOAuthClientPermissionsById(id: string) {
    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(id);
    return oAuthClient?.permissions;
  }
}
