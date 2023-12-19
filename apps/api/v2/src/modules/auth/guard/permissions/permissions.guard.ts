import { Permissions } from "@/modules/auth/decorator/permissions/permissions.decorator";
import { MembershipRepository } from "@/modules/membership/membership.repository";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { hasPermissions } from "@calcom/platform-utils";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private membershipRepository: MembershipRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get(Permissions, context.getHandler());
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const accessToken = request.get("Authorization");

    if (!accessToken) {
      return false;
    }

    // TODO: Extract from access token payload
    const userPermissions = 32;

    return hasPermissions(userPermissions, requiredPermissions);
  }
}
