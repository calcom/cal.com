import { Workflow } from "../entities/Workflow";
import { IWorkflowPermissionRepository } from "../repositories/IWorkflowPermissionRepository";
import { UserId } from "../value-objects/UserId";
import { WorkflowPermission } from "../value-objects/WorkflowPermission";

/**
 * Domain Service for Workflow Permissions
 *
 * Contains the core business logic for determining workflow permissions.
 * This service orchestrates the permission checking rules and delegates
 * infrastructure concerns to the repository.
 */
export class WorkflowPermissionService {
  constructor(private readonly permissionRepository: IWorkflowPermissionRepository) {}

  /**
   * Get permissions for a single workflow
   *
   * Business Rules:
   * - Personal workflows: Only the owner has full access
   * - Team workflows: Permissions are determined by team membership and PBAC
   * - Null workflows: No access
   */
  async getPermissions(workflow: Workflow | null, userId: UserId): Promise<WorkflowPermission> {
    if (!workflow) {
      return WorkflowPermission.noAccess();
    }

    // Personal workflow: Check ownership
    if (workflow.isPersonal()) {
      return this.getPersonalWorkflowPermissions(workflow, userId);
    }

    // Team workflow: Use repository to check team permissions
    if (workflow.isTeamWorkflow()) {
      return await this.permissionRepository.getWorkflowPermissions(workflow, userId);
    }

    // This should never happen due to Workflow entity invariants
    throw new Error("Workflow must be either personal or team workflow");
  }

  /**
   * Get permissions for multiple workflows (optimized)
   *
   * This method optimizes permission checking by:
   * 1. Separating personal and team workflows
   * 2. Batch processing team permissions
   * 3. Combining results efficiently
   */
  async getPermissionsBatch<T extends { id: number; userId: number | null; teamId: number | null }>(
    workflowRecords: T[],
    userId: UserId
  ): Promise<(T & { permissions: WorkflowPermission; readOnly: boolean })[]> {
    const workflows = workflowRecords.map((record) => Workflow.fromRecord(record));

    // Separate personal and team workflows
    const personalWorkflows = workflows.filter((w) => w.isPersonal());
    const teamWorkflows = workflows.filter((w) => w.isTeamWorkflow());

    // Get permissions for team workflows in batch
    const teamPermissionsMap =
      teamWorkflows.length > 0
        ? await this.permissionRepository.getWorkflowPermissionsBatch(teamWorkflows, userId)
        : new Map();

    // Build result with permissions
    return workflowRecords.map((record, index) => {
      const workflow = workflows[index];
      let permissions: WorkflowPermission;

      if (workflow.isPersonal()) {
        permissions = this.getPersonalWorkflowPermissions(workflow, userId);
      } else {
        permissions = teamPermissionsMap.get(workflow.id) ?? WorkflowPermission.noAccess();
      }

      return {
        ...record,
        permissions,
        readOnly: permissions.readOnly,
      };
    });
  }

  /**
   * Check if a user can perform a specific action on a workflow
   */
  async canPerformAction(
    workflow: Workflow | null,
    userId: UserId,
    action: "view" | "update" | "delete"
  ): Promise<boolean> {
    const permissions = await this.getPermissions(workflow, userId);

    switch (action) {
      case "view":
        return permissions.canView;
      case "update":
        return permissions.canUpdate;
      case "delete":
        return permissions.canDelete;
      default:
        return false;
    }
  }

  /**
   * Get permissions for a personal workflow
   *
   * Business Rule: Only the owner has full access to personal workflows
   */
  private getPersonalWorkflowPermissions(workflow: Workflow, userId: UserId): WorkflowPermission {
    if (workflow.isOwnedBy(userId)) {
      return WorkflowPermission.fullAccess();
    }
    return WorkflowPermission.noAccess();
  }
}
