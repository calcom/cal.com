import type { Workflow } from "../models/Workflow";

/**
 * Interface for Workflow Repository
 * Follows Dependency Inversion Principle
 * Uses domain types only - no Prisma dependencies
 * 
 * NOTE: This interface is intentionally minimal, containing only the methods
 * currently used by the migrated code. Additional methods can be added as
 * more code is migrated to use the DDD structure.
 */
export interface IWorkflowRepository {
  // Read operations for routing forms
  findWorkflowsActiveOnRoutingForm(routingFormId: string): Promise<Workflow[]>;
  
  // Additional methods will be added here as more code is migrated
  // to use the DDD repository pattern
}
