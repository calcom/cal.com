import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { isApiKey } from "@/modules/auth/strategies/bearer/bearer.strategy";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { hasPermissions } from "@calcom/platform-utils";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokensRepository: TokensRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());
    const request = context.switchToHttp().getRequest();
    const bearerToken = request.get("Authorization")?.replace("Bearer ", "");

    if (!requiredPermissions?.length || !Object.keys(requiredPermissions)?.length || isApiKey(bearerToken)) {
      return true;
    }

    if (!bearerToken) {
      return false;
    }

    const oAuthClientPermissions = await this.getOAuthClientPermissions(bearerToken);

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
