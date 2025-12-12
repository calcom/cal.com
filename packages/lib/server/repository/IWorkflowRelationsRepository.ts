/**
 * ORM-agnostic interface for WorkflowRelationsRepository
 * This interface defines the contract for workflow relations data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface WorkflowOnTeamDto {
  teamId: number;
}

export interface WorkflowOnEventTypeDto {
  eventTypeId: number;
  eventType: {
    children: { id: number }[];
  };
}

export interface IWorkflowRelationsRepository {
  deleteAllActiveOnTeams(workflowId: number): Promise<{ count: number }>;
  createActiveOnTeams(workflowId: number, teamIds: number[]): Promise<void>;
  findActiveOnTeams(workflowId: number): Promise<WorkflowOnTeamDto[]>;
  deleteAllActiveOnRoutingForms(workflowId: number): Promise<{ count: number }>;
  createActiveOnRoutingForms(workflowId: number, routingFormIds: string[]): Promise<void>;
  deleteAllActiveOnEventTypes(workflowId: number): Promise<{ count: number }>;
  createActiveOnEventTypes(workflowId: number, eventTypeIds: number[]): Promise<void>;
  findActiveOnEventTypes(workflowId: number): Promise<WorkflowOnEventTypeDto[]>;
  deleteAllActiveOnRelations(workflowId: number): Promise<void>;
}
