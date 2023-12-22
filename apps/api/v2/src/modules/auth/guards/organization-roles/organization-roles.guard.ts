import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { MembershipsRepository } from "@/modules/repositories/memberships/memberships.repository";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class OrganizationRolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private membershipRepository: MembershipsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get(Roles, context.getHandler());

    if (!requiredRoles.length || !Object.keys(requiredRoles).length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const partOfOrganization = Boolean(user?.organizationId);

    if (!user || !partOfOrganization) {
      return false;
    }

    const membership = await this.membershipRepository.findOrgUserMembership(user.organizationId, user.id);
    const isAccepted = membership.accepted;
    const hasRequiredRole = requiredRoles.includes(membership.role);

    return isAccepted && hasRequiredRole;
  }
}
