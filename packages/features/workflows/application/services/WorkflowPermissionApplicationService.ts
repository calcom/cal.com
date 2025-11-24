import { Workflow } from "../../domain/entities/Workflow";
import { WorkflowPermissionService } from "../../domain/services/WorkflowPermissionService";
import { UserId } from "../../domain/value-objects/UserId";
import { WorkflowPermission } from "../../domain/value-objects/WorkflowPermission";
import { WorkflowPermissionRepository } from "../../infrastructure/repositories/WorkflowPermissionRepository";

/**
 * Application Service for Workflow Permissions
 *
 * This service provides the public API for workflow permissions and acts as
 * the entry point for the application layer. It coordinates between the
 * domain service and infrastructure.
 */
export class WorkflowPermissionApplicationService {
  private readonly domainService: WorkflowPermissionService;
  private readonly repository: WorkflowPermissionRepository;

  constructor() {
    this.repository = new WorkflowPermissionRepository();
    this.domainService = new WorkflowPermissionService(this.repository);
  }

  /**
   * Get permissions for a single workflow
   */
  async getWorkflowPermissions(
    workflow: { id: number; userId: number | null; teamId: number | null } | null,
    currentUserId: number
  ): Promise<{
    canView: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    readOnly: boolean;
  }> {
    const workflowEntity = workflow ? Workflow.fromRecord(workflow) : null;
    const userId = UserId.fromNumber(currentUserId);

    const permissions = await this.domainService.getPermissions(workflowEntity, userId);
    return permissions.toPlainObject();
  }

  /**
   * Get permissions for multiple workflows (optimized)
   */
  async getWorkflowPermissionsBatch<T extends { id: number; userId: number | null; teamId: number | null }>(
    workflows: T[],
    currentUserId: number
  ): Promise<
    (T & {
      permissions: { canView: boolean; canUpdate: boolean; canDelete: boolean; readOnly: boolean };
      readOnly: boolean;
    })[]
  > {
    const userId = UserId.fromNumber(currentUserId);

    const result = await this.domainService.getPermissionsBatch(workflows, userId);

    // Convert domain permissions to plain objects
    return result.map((item) => ({
      ...item,
      permissions: item.permissions.toPlainObject(),
    }));
  }

  /**
   * Check if a user can perform a specific action on a workflow
   */
  async canPerformAction(
    workflow: { id: number; userId: number | null; teamId: number | null } | null,
    currentUserId: number,
    action: "view" | "update" | "delete"
  ): Promise<boolean> {
    const workflowEntity = workflow ? Workflow.fromRecord(workflow) : null;
    const userId = UserId.fromNumber(currentUserId);

    return await this.domainService.canPerformAction(workflowEntity, userId, action);
  }

  /**
   * Clear permissions cache (useful for testing or when permissions change)
   */
  clearCache(): void {
    this.repository.clearCache();
  }
}

// Singleton instance for convenience
let instance: WorkflowPermissionApplicationService | null = null;

/**
 * Get the singleton instance of WorkflowPermissionApplicationService
 */
export function getWorkflowPermissionService(): WorkflowPermissionApplicationService {
  if (!instance) {
    instance = new WorkflowPermissionApplicationService();
  }
  return instance;
}
