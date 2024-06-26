import { ORG_ROLES, TEAM_ROLES, SYSTEM_ADMIN_ROLE } from "@/lib/roles/constants";
import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private membershipRepository: MembershipsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const teamId = request.params.teamId as string;
    const orgId = request.params.orgId as string;
    const user = request.user as GetUserReturnType;
    const allowedRole = this.reflector.get(Roles, context.getHandler());

    // System admin can access everything
    if (user.isSystemAdmin) {
      return true;
    }

    // if the required role is SYSTEM_ADMIN_ROLE but user is not system admin, return false
    if (allowedRole === SYSTEM_ADMIN_ROLE && !user.isSystemAdmin) {
      return false;
    }

    // Checking the role of the user within the organization
    if (Boolean(orgId) && !Boolean(teamId)) {
      const membership = await this.membershipRepository.findMembershipByOrgId(Number(orgId), user.id);
      if (!membership) {
        throw new ForbiddenException("User is not a member of the organization.");
      }

      if (ORG_ROLES.includes(allowedRole as unknown as (typeof ORG_ROLES)[number])) {
        return hasMinimumRole({
          checkRole: `ORG_${membership.role}`,
          minimumRole: allowedRole,
          roles: ORG_ROLES,
        });
      }
    }

    // Checking the role of the user within the team
    if (Boolean(teamId) && !Boolean(orgId)) {
      const membership = await this.membershipRepository.findMembershipByTeamId(Number(teamId), user.id);
      if (!membership) {
        throw new ForbiddenException("User is not a member of the team.");
      }
      if (TEAM_ROLES.includes(allowedRole as unknown as (typeof TEAM_ROLES)[number])) {
        return hasMinimumRole({
          checkRole: `TEAM_${membership.role}`,
          minimumRole: allowedRole,
          roles: TEAM_ROLES,
        });
      }
    }

    // Checking the role for team and org, org is above team in term of permissions
    if (Boolean(teamId) && Boolean(orgId)) {
      const teamMembership = await this.membershipRepository.findMembershipByTeamId(Number(teamId), user.id);
      const orgMembership = await this.membershipRepository.findMembershipByOrgId(Number(orgId), user.id);

      if (!orgMembership) {
        throw new ForbiddenException("User is not part of the organization.");
      }

      // if the role checked is a TEAM role
      if (TEAM_ROLES.includes(allowedRole as unknown as (typeof TEAM_ROLES)[number])) {
        console.log("ORGMEM", orgMembership.role);
        // if the user is admin or owner of org, allow request because org > team
        if (`ORG_${orgMembership.role}` === "ORG_ADMIN" || `ORG_${orgMembership.role}` === "ORG_OWNER") {
          return true;
        }

        if (!teamMembership) {
          throw new ForbiddenException(
            "User is not part of the team and/or, is not an admin nor an owner of the organization."
          );
        }

        // if user is not admin nor an owner of org, and is part of the team, then check user team membership role
        return hasMinimumRole({
          checkRole: `TEAM_${teamMembership.role}`,
          minimumRole: allowedRole,
          roles: TEAM_ROLES,
        });
      }

      // if allowed role is a ORG ROLE, check org membersip role
      if (ORG_ROLES.includes(allowedRole as unknown as (typeof ORG_ROLES)[number])) {
        return hasMinimumRole({
          checkRole: `ORG_${orgMembership.role}`,
          minimumRole: allowedRole,
          roles: ORG_ROLES,
        });
      }
    }

    return false;
  }
}

type Roles = (typeof ORG_ROLES)[number] | (typeof TEAM_ROLES)[number];

type HasMinimumTeamRoleProp = {
  checkRole: (typeof TEAM_ROLES)[number];
  minimumRole: string;
  roles: typeof TEAM_ROLES;
};

type HasMinimumOrgRoleProp = {
  checkRole: (typeof ORG_ROLES)[number];
  minimumRole: string;
  roles: typeof ORG_ROLES;
};

type HasMinimumRoleProp = HasMinimumTeamRoleProp | HasMinimumOrgRoleProp;

export function hasMinimumRole(props: HasMinimumRoleProp): boolean {
  const checkedRoleIndex = props.roles.indexOf(props.checkRole as never);
  const requiredRoleIndex = props.roles.indexOf(props.minimumRole as never);

  // minimum role given does not exist
  if (checkedRoleIndex === -1 || requiredRoleIndex === -1) {
    throw new Error("Invalid role");
  }

  return checkedRoleIndex <= requiredRoleIndex;
}
