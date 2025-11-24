import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { isAuthorized } from "@calcom/trpc/server/routers/viewer/workflows/util";

import { Workflow } from "../../domain/entities/Workflow";
import { IWorkflowPermissionRepository } from "../../domain/repositories/IWorkflowPermissionRepository";
import { TeamId } from "../../domain/value-objects/TeamId";
import { UserId } from "../../domain/value-objects/UserId";
import { WorkflowId } from "../../domain/value-objects/WorkflowId";
import { WorkflowPermission } from "../../domain/value-objects/WorkflowPermission";

/**
 * Infrastructure implementation of IWorkflowPermissionRepository
 *
 * This class handles the infrastructure concerns:
 * - Caching team permissions for performance
 * - Integrating with the existing PBAC system
 * - Converting between domain objects and primitives
 */
export class WorkflowPermissionRepository implements IWorkflowPermissionRepository {
  private teamPermissionsCache: Map<string, WorkflowPermission> = new Map();

  /**
   * Check if a user has a specific permission on a workflow
   */
  async checkWorkflowPermission(
    workflow: Workflow,
    userId: UserId,
    permission: "read" | "update" | "delete"
  ): Promise<boolean> {
    const permissionString: PermissionString = `workflow.${permission}` as PermissionString;

    // Convert domain objects to primitives for the existing isAuthorized function
    const workflowPrimitive = workflow.toPrimitives();

    return await isAuthorized(workflowPrimitive, userId.toNumber(), permissionString);
  }

  /**
   * Get all permissions for a user on a specific workflow
   */
  async getWorkflowPermissions(workflow: Workflow, userId: UserId): Promise<WorkflowPermission> {
    // For personal workflows, handle directly
    if (workflow.isPersonal()) {
      const isOwner = workflow.isOwnedBy(userId);
      return isOwner ? WorkflowPermission.fullAccess() : WorkflowPermission.noAccess();
    }

    // For team workflows, use team permissions
    if (workflow.isTeamWorkflow() && workflow.teamId) {
      return await this.getTeamWorkflowPermissions(workflow.teamId, userId);
    }

    return WorkflowPermission.noAccess();
  }

  /**
   * Get permissions for multiple workflows (optimized batch operation)
   */
  async getWorkflowPermissionsBatch(
    workflows: Workflow[],
    userId: UserId
  ): Promise<Map<WorkflowId, WorkflowPermission>> {
    const result = new Map<WorkflowId, WorkflowPermission>();

    // Separate personal and team workflows
    const personalWorkflows = workflows.filter((w) => w.isPersonal());
    const teamWorkflows = workflows.filter((w) => w.isTeamWorkflow());

    // Handle personal workflows (no async needed)
    personalWorkflows.forEach((workflow) => {
      const isOwner = workflow.isOwnedBy(userId);
      const permissions = isOwner ? WorkflowPermission.fullAccess() : WorkflowPermission.noAccess();
      result.set(workflow.id, permissions);
    });

    // Pre-fetch team permissions for all unique teams
    const uniqueTeamIds = Array.from(
      new Set(teamWorkflows.map((w) => w.teamId).filter((teamId): teamId is TeamId => teamId !== null))
    );

    if (uniqueTeamIds.length > 0) {
      const teamPermissionsMap = await this.getTeamWorkflowPermissionsBatch(uniqueTeamIds, userId);

      // Map team permissions to workflows
      teamWorkflows.forEach((workflow) => {
        if (workflow.teamId) {
          const permissions = teamPermissionsMap.get(workflow.teamId) ?? WorkflowPermission.noAccess();
          result.set(workflow.id, permissions);
        }
      });
    }

    return result;
  }

  /**
   * Check if a user has a specific permission on a team
   */
  async checkTeamPermission(
    teamId: TeamId,
    userId: UserId,
    permission: "workflow.read" | "workflow.update" | "workflow.delete"
  ): Promise<boolean> {
    // Create a mock workflow object for team permission checking
    const mockWorkflow = { id: 0, teamId: teamId.toNumber(), userId: null };

    return await isAuthorized(mockWorkflow, userId.toNumber(), permission as PermissionString);
  }

  /**
   * Get all workflow permissions for a user on a specific team
   */
  async getTeamWorkflowPermissions(teamId: TeamId, userId: UserId): Promise<WorkflowPermission> {
    const cacheKey = `${teamId.toString()}-${userId.toString()}`;

    // Check cache first
    if (this.teamPermissionsCache.has(cacheKey)) {
      return this.teamPermissionsCache.get(cacheKey)!;
    }

    // Check all permissions in parallel for better performance
    const [canView, canUpdate, canDelete] = await Promise.all([
      this.checkTeamPermission(teamId, userId, "workflow.read"),
      this.checkTeamPermission(teamId, userId, "workflow.update"),
      this.checkTeamPermission(teamId, userId, "workflow.delete"),
    ]);

    const permissions = WorkflowPermission.fromBooleans(canView, canUpdate, canDelete);

    // Cache the result
    this.teamPermissionsCache.set(cacheKey, permissions);

    return permissions;
  }

  /**
   * Get team workflow permissions for multiple teams (optimized batch operation)
   */
  async getTeamWorkflowPermissionsBatch(
    teamIds: TeamId[],
    userId: UserId
  ): Promise<Map<TeamId, WorkflowPermission>> {
    const result = new Map<TeamId, WorkflowPermission>();

    // Process all teams in parallel
    const permissionPromises = teamIds.map(async (teamId) => {
      const permissions = await this.getTeamWorkflowPermissions(teamId, userId);
      return { teamId, permissions };
    });

    const results = await Promise.all(permissionPromises);

    results.forEach(({ teamId, permissions }) => {
      result.set(teamId, permissions);
    });

    return result;
  }

  /**
   * Clear the permissions cache (useful for testing or when permissions change)
   */
  clearCache(): void {
    this.teamPermissionsCache.clear();
  }

  /**
   * Clear cache for a specific team and user combination
   */
  clearCacheForTeamAndUser(teamId: TeamId, userId: UserId): void {
    const cacheKey = `${teamId.toString()}-${userId.toString()}`;
    this.teamPermissionsCache.delete(cacheKey);
  }
}
