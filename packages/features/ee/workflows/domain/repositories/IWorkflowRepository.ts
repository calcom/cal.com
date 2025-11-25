import type { Workflow, CreateWorkflowData, UpdateWorkflowData } from "../models/Workflow";

/**
 * Interface for Workflow Repository
 * Follows Dependency Inversion Principle
 * Uses domain types only - no Prisma dependencies
 */
export interface IWorkflowRepository {
  // Read operations
  findById(id: number): Promise<Workflow | null>;
  findByUserId(userId: number, excludeFormTriggers?: boolean): Promise<Workflow[]>;
  findByTeamId(teamId: number, userId: number, excludeFormTriggers?: boolean): Promise<Workflow[]>;
  findActiveOrgWorkflows(params: {
    orgId: number;
    userId: number;
    teamId: number;
    excludeFormTriggers: boolean;
  }): Promise<Workflow[]>;
  findAllWorkflows(userId: number, excludeFormTriggers?: boolean): Promise<Workflow[]>;
  findWorkflowsActiveOnRoutingForm(routingFormId: string): Promise<Workflow[]>;
  findActiveWorkflowsOnTeam(params: { parentTeamId: number; teamId: number }): Promise<Workflow[]>;

  // Write operations
  create(data: CreateWorkflowData): Promise<Workflow>;
  update(id: number, data: UpdateWorkflowData): Promise<Workflow>;
  delete(id: number): Promise<void>;

  // Specialized queries
  getActiveOnEventTypeIds(params: {
    workflowId: number;
    userId: number;
    teamId?: number;
  }): Promise<number[]>;
}
