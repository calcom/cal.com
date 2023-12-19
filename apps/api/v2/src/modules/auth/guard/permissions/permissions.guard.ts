import { Permissions } from "@/modules/auth/decorator/permissions/permissions.decorator";
import { Injectable, CanActivate, ExecutionContext, Global } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { hasPermissions } from "@calcom/platform-utils";

@Global()
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());
    if (!requiredPermissions.length || !Object.keys(requiredPermissions).length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const accessToken = request.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return false;
    }

    // TODO: Extract from access token payload
    const userPermissions = 32;

    return hasPermissions(userPermissions, requiredPermissions);
  }
}
