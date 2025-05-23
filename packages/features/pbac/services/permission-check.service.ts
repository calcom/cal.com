import type { PermissionCheck, TeamPermissions } from "../domain/models/Permission";
import type { IPermissionRepository } from "../domain/repositories/IPermissionRepository";
import type { PermissionString } from "../domain/types/permission-registry";
import { PermissionRepository } from "../infrastructure/repositories/PermissionRepository";

export class PermissionCheckService {
  constructor(private readonly repository: IPermissionRepository = new PermissionRepository()) {}

  async getUserPermissions(userId: number): Promise<TeamPermissions[]> {
    const memberships = await this.repository.getUserMemberships(userId);
    return memberships;
  }

  async hasPermission(query: PermissionCheck, permission: PermissionString): Promise<boolean> {
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

  async hasPermissions(query: PermissionCheck, permissions: PermissionString[]): Promise<boolean> {
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

  private async getMembership(query: PermissionCheck) {
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
