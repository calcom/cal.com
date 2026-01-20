import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsService } from "@/modules/organizations/index/organizations.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { MembershipRole } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private organizationsService: OrganizationsService,
    private membershipRepository: MembershipsRepository,
    private usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UserWithProfile = request.user;
    const organizationId = this.getOrganizationId(context);

    if (!user || !organizationId) {
      throw new ForbiddenException("OrganizationRolesGuard - No organization associated with the user.");
    }

    await this.isPlatform(organizationId);

    const membership = await this.membershipRepository.findOrgUserMembership(organizationId, user.id);
    const allowedRoles = this.reflector.get(MembershipRoles, context.getHandler());

    this.isMembershipAccepted(membership.accepted);
    this.isRoleAllowed(membership.role, allowedRoles);

    return true;
  }

  async isPlatform(organizationId: number) {
    const isPlatform = await this.organizationsService.isPlatform(organizationId);
    if (!isPlatform) {
      throw new ForbiddenException("OrganizationRolesGuard - Organization is not a platform (SHP).");
    }
  }

  getOrganizationId(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user: UserWithProfile = request.user;
    const authMethodOrganizationId = request.organizationId;
    if (authMethodOrganizationId) return authMethodOrganizationId;

    const userOrganizationId = user ? this.usersService.getUserMainOrgId(user) : null;
    return userOrganizationId;
  }

  isMembershipAccepted(accepted: boolean) {
    if (!accepted) {
      throw new ForbiddenException(
        `OrganizationRolesGuard - User has not accepted membership in the organization.`
      );
    }
  }

  isRoleAllowed(membershipRole: MembershipRole, allowedRoles: MembershipRole[]) {
    if (!allowedRoles?.length || !Object.keys(allowedRoles)?.length) {
      return true;
    }

    const hasRequiredRole = allowedRoles.includes(membershipRole);
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `OrganizationRolesGuard - User must have one of the roles: ${allowedRoles.join(", ")}.`
      );
    }
  }
}
