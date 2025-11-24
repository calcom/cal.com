import type { Workflow } from "@calcom/prisma/client";

import { getWorkflowPermissionService } from "../application/services/WorkflowPermissionApplicationService";

/**
 * @deprecated Use WorkflowPermission value object from domain layer instead
 * This interface is kept for backward compatibility
 */
export interface WorkflowPermissions {
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  readOnly: boolean; // Keep for backward compatibility
}

/**
 * @deprecated Use WorkflowPermissionApplicationService instead
 * This class is kept for backward compatibility and delegates to the new DDD structure
 */
export class WorkflowPermissionsBuilder {
  private currentUserId: number;
  private applicationService = getWorkflowPermissionService();

  constructor(currentUserId: number) {
    this.currentUserId = currentUserId;
  }

  /**
   * Build permissions for a single workflow
   * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissions instead
   */
  async buildPermissions(
    workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null
  ): Promise<WorkflowPermissions> {
    return await this.applicationService.getWorkflowPermissions(workflow, this.currentUserId);
  }

  /**
   * Batch build permissions for multiple workflows (optimized)
   * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissionsBatch instead
   */
  async buildPermissionsForWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
    workflows: T[]
  ): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
    return await this.applicationService.getWorkflowPermissionsBatch(workflows, this.currentUserId);
  }

  /**
   * Static factory method for convenience
   * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissions instead
   */
  static async buildPermissions(
    workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null,
    currentUserId: number
  ): Promise<WorkflowPermissions> {
    const service = getWorkflowPermissionService();
    return await service.getWorkflowPermissions(workflow, currentUserId);
  }

  /**
   * Static method for batch processing
   * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissionsBatch instead
   */
  static async buildPermissionsForWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
    workflows: T[],
    currentUserId: number
  ): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
    const service = getWorkflowPermissionService();
    return await service.getWorkflowPermissionsBatch(workflows, currentUserId);
  }
}

/**
 * Utility function to add permissions to a single workflow
 * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissions instead
 */
export async function addPermissionsToWorkflow<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
  workflow: T,
  currentUserId: number
): Promise<T & { permissions: WorkflowPermissions; readOnly: boolean }> {
  const service = getWorkflowPermissionService();
  const permissions = await service.getWorkflowPermissions(workflow, currentUserId);
  return {
    ...workflow,
    permissions,
    readOnly: permissions.readOnly,
  };
}

/**
 * Utility function to add permissions to multiple workflows (optimized)
 * @deprecated Use WorkflowPermissionApplicationService.getWorkflowPermissionsBatch instead
 */
export async function addPermissionsToWorkflows<T extends Pick<Workflow, "id" | "teamId" | "userId">>(
  workflows: T[],
  currentUserId: number
): Promise<(T & { permissions: WorkflowPermissions; readOnly: boolean })[]> {
  const service = getWorkflowPermissionService();
  return await service.getWorkflowPermissionsBatch(workflows, currentUserId);
}
