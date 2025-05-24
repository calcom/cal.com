import { PermissionRepository } from "../repository/permission.repository";
import type { PermissionString } from "../types/permission-registry";

export function transformDbPermissionsToTeamPermissions(
  memberships: {
    teamId: number;
    role: { id: string | null; permissions: { resource: string | null; action: string | null }[] } | null;
  }[]
): Record<number, { roleId: string; permissions: PermissionString[] }> {
  const teamPermissions: Record<number, { roleId: string; permissions: PermissionString[] }> = {};

  for (const membership of memberships) {
    if (!membership.teamId || !membership.role?.id || !membership.role.permissions) continue;

    const validPermissions = membership.role.permissions.filter(
      (p): p is { resource: string; action: string } =>
        typeof p.resource === "string" &&
        typeof p.action === "string" &&
        p.resource !== null &&
        p.action !== null
    );

    teamPermissions[membership.teamId] = {
      roleId: membership.role.id,
      permissions: validPermissions.map((p) => `${p.resource}.${p.action}` as PermissionString),
    };
  }

  return teamPermissions;
}

export class PermissionCheckService {
  private repository: PermissionRepository;

  constructor() {
    this.repository = new PermissionRepository();
  }

  async getUserPermissions(userId: number) {
    const memberships = await this.repository.getUserMemberships(userId);
    return transformDbPermissionsToTeamPermissions(memberships);
  }

  async hasPermission(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permission: PermissionString
  ): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // Check team membership first
    if (membership?.customRoleId) {
      const hasTeamPermission = await this.repository.checkRolePermission(
        membership.customRoleId,
        permission
      );
      if (hasTeamPermission) return true;
    }

    // If no team permission and there's an org membership, check org permissions
    if (orgMembership?.customRoleId) {
      return this.repository.checkRolePermission(orgMembership.customRoleId, permission);
    }

    return false;
  }

  async hasPermissions(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permissions: PermissionString[]
  ): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // Check team membership first
    if (membership?.customRoleId) {
      const hasTeamPermissions = await this.repository.checkRolePermissions(
        membership.customRoleId,
        permissions
      );
      if (hasTeamPermissions) return true;
    }

    // If no team permissions and there's an org membership, check org permissions
    if (orgMembership?.customRoleId) {
      return this.repository.checkRolePermissions(orgMembership.customRoleId, permissions);
    }

    return false;
  }

  private async getMembership(query: { membershipId?: number; userId?: number; teamId?: number }) {
    let membership = null;
    let orgMembership = null;

    // Get the team membership
    if (query.membershipId) {
      membership = await this.repository.getMembershipByMembershipId(query.membershipId);
    } else if (query.userId && query.teamId) {
      membership = await this.repository.getMembershipByUserAndTeam(query.userId, query.teamId);
    }

    // If we found a membership and the team has a parent org, get the org membership
    if (membership?.team_parentId) {
      orgMembership = await this.repository.getOrgMembership(membership.userId, membership.team_parentId);
    }

    return { membership, orgMembership };
  }
}
