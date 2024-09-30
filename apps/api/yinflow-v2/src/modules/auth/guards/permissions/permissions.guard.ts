import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getToken } from "next-auth/jwt";

import { hasPermissions } from "@calcom/platform-utils";

import { getEnv } from "../../../../env";
import { isApiKey } from "../../../../lib/api-key";
import { Permissions } from "../../../auth/decorators/permissions/permissions.decorator";
import { TokensRepository } from "../../../tokens/tokens.repository";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokensRepository: TokensRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());

    if (!requiredPermissions?.length || !Object.keys(requiredPermissions)?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authString = request.get("Authorization")?.replace("Bearer ", "");
    const apiKeyPrefix = getEnv("API_KEY_PREFIX");
    const nextAuthSecret = getEnv("NEXTAUTH_SECRET");
    const nextAuthToken = await getToken({ req: request, secret: nextAuthSecret });

    if (nextAuthToken) {
      return true;
    }

    if (!authString) {
      return false;
    }

    // only check permissions for accessTokens attached to an oAuth Client
    if (isApiKey(authString, apiKeyPrefix ?? "cal_")) {
      return true;
    }

    const oAuthClientPermissions = await this.getOAuthClientPermissions(authString);

    if (!oAuthClientPermissions) {
      return false;
    }

    return hasPermissions(oAuthClientPermissions, [...requiredPermissions]);
  }

  async getOAuthClientPermissions(accessToken: string) {
    const oAuthClient = await this.tokensRepository.getAccessTokenClient(accessToken);
    return oAuthClient?.permissions;
  }
}
