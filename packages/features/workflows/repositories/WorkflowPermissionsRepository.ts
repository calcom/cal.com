import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import type { Workflow } from "@calcom/prisma/client";

export interface WorkflowPermissions {
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  readOnly: boolean; // Keep for backward compatibility
}

interface TeamPermissionsCache {
  [teamId: string]: WorkflowPermissions;
}

export class WorkflowPermissionsBuilder {
  private currentUserId: number;
  private teamPermissionsCache: TeamPermissionsCache = {};

  constructor(currentUserId: number) {
    this.currentUserId = currentUserId;
  }

  /**
   * Get permissions for a team (cached)
   */
  private async getTeamPermissions(teamId: number): Promise<WorkflowPermissions> {
    const cacheKey = teamId.toString();

    if (this.teamPermissionsCache[cacheKey]) {
      return this.teamPermissionsCache[cacheKey];
    }

    // Create a mock workflow object for team permission checking
    const mockWorkflow = { id: 0, teamId, userId: null };

    // Check all permissions in parallel for better performance
    const [canView, canUpdate, canDelete] = await Promise.all([
      isAuthorized(mockWorkflow, this.currentUserId, "workflow.read"),
      isAuthorized(mockWorkflow, this.currentUserId, "workflow.update"),
      isAuthorized(mockWorkflow, this.currentUserId, "workflow.delete"),
    ]);

    const permissions = {
      canView,
      canUpdate,
      canDelete,
      readOnly: !canUpdate,
    };

    this.teamPermissionsCache[cacheKey] = permissions;
    return permissions;
  }

  /**
   * Get permissions for a personal workflow
   */
  private getPersonalWorkflowPermissions(workflow: Pick<Workflow, "userId">): WorkflowPermissions {
    const isOwner = workflow.userId === this.currentUserId;
    return {
      canView: isOwner,
      canUpdate: isOwner,
      canDelete: isOwner,
      readOnly: !isOwner,
    };
  }

  /**
   * Build permissions for a single workflow
   */
  async buildPermissions(
    workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null
  ): Promise<WorkflowPermissions> {
    if (!workflow) {
      return {
        canView: false,
        canUpdate: false,
        canDelete: false,
        readOnly: true,
      };
    }

    // Personal workflow
    if (!workflow.teamId) {
      return this.getPersonalWorkflowPermissions(workflow);
    }

    // Team workflow
    return await this.getTeamPermissions(workflow.teamId);
  }

  /**
   * Batch build permissions for multiple workflows (optimized)
   */
  async buildPermissionsForWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
    workflows: T[]
  ): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
    // Pre-fetch permissions for all unique teams
    const teamIds = workflows.filter((w) => w.teamId).map((w) => w.teamId!);
    const uniqueTeamIds = teamIds.filter((id, index) => teamIds.indexOf(id) === index);
    await Promise.all(uniqueTeamIds.map((teamId) => this.getTeamPermissions(teamId)));

    // Now build permissions for each workflow (using cache)
    const result = await Promise.all(
      workflows.map(async (workflow) => {
        const permissions = await this.buildPermissions(workflow);
        return {
          ...workflow,
          permissions,
          readOnly: permissions.readOnly,
        };
      })
    );

    return result;
  }

  /**
   * Static factory method for convenience
   */
  static async buildPermissions(
    workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null,
    currentUserId: number
  ): Promise<WorkflowPermissions> {
    const builder = new WorkflowPermissionsBuilder(currentUserId);
    return await builder.buildPermissions(workflow);
  }

  /**
   * Static method for batch processing
   */
  static async buildPermissionsForWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
    workflows: T[],
    currentUserId: number
  ): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
    const builder = new WorkflowPermissionsBuilder(currentUserId);
    return await builder.buildPermissionsForWorkflows(workflows);
  }
}

/**
 * Utility function to add permissions to a single workflow
 */
export async function addPermissionsToWorkflow<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
  workflow: T,
  currentUserId: number
): Promise<T & { permissions: WorkflowPermissions; readOnly: boolean }> {
  const permissions = await WorkflowPermissionsBuilder.buildPermissions(workflow, currentUserId);
  return {
    ...workflow,
    permissions,
    readOnly: permissions.readOnly,
  };
}

/**
 * Utility function to add permissions to multiple workflows (optimized)
 */
export async function addPermissionsToWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
  workflows: T[],
  currentUserId: number
): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
  return await WorkflowPermissionsBuilder.buildPermissionsForWorkflows(workflows, currentUserId);
}
