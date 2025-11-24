import { Workflow } from "../entities/Workflow";
import { TeamId } from "../value-objects/TeamId";
import { UserId } from "../value-objects/UserId";
import { WorkflowId } from "../value-objects/WorkflowId";
import { WorkflowPermission } from "../value-objects/WorkflowPermission";

/**
 * Repository interface for workflow permission operations.
 *
 * This interface defines the contract for accessing workflow permission data
 * and authorization checks. Implementations handle the infrastructure concerns.
 */
export interface IWorkflowPermissionRepository {
  /**
   * Check if a user has a specific permission on a workflow
   */
  checkWorkflowPermission(
    workflow: Workflow,
    userId: UserId,
    permission: "read" | "update" | "delete"
  ): Promise<boolean>;

  /**
   * Get all permissions for a user on a specific workflow
   */
  getWorkflowPermissions(workflow: Workflow, userId: UserId): Promise<WorkflowPermission>;

  /**
   * Get permissions for multiple workflows (optimized batch operation)
   */
  getWorkflowPermissionsBatch(
    workflows: Workflow[],
    userId: UserId
  ): Promise<Map<WorkflowId, WorkflowPermission>>;

  /**
   * Check if a user has a specific permission on a team (for team workflows)
   */
  checkTeamPermission(
    teamId: TeamId,
    userId: UserId,
    permission: "workflow.read" | "workflow.update" | "workflow.delete"
  ): Promise<boolean>;

  /**
   * Get all workflow permissions for a user on a specific team
   */
  getTeamWorkflowPermissions(teamId: TeamId, userId: UserId): Promise<WorkflowPermission>;

  /**
   * Get team workflow permissions for multiple teams (optimized batch operation)
   */
  getTeamWorkflowPermissionsBatch(
    teamIds: TeamId[],
    userId: UserId
  ): Promise<Map<TeamId, WorkflowPermission>>;
}
