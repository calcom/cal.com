/**
 * ORM-agnostic interface for WorkflowStepRepository
 * This interface defines the contract for workflow step data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

export interface WorkflowStepDto {
  id: number;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  template: WorkflowTemplates;
  numberRequired: boolean | null;
  sender: string | null;
  numberVerificationPending: boolean;
  includeCalendarEvent: boolean;
}

export interface WorkflowStepCreateInputDto {
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo?: string | null;
  reminderBody?: string | null;
  emailSubject?: string | null;
  template: WorkflowTemplates;
  numberRequired?: boolean | null;
  sender?: string | null;
  numberVerificationPending?: boolean;
  includeCalendarEvent?: boolean;
}

export interface WorkflowStepUpdateInputDto {
  stepNumber?: number;
  action?: WorkflowActions;
  sendTo?: string | null;
  reminderBody?: string | null;
  emailSubject?: string | null;
  template?: WorkflowTemplates;
  numberRequired?: boolean | null;
  sender?: string | null;
  numberVerificationPending?: boolean;
  includeCalendarEvent?: boolean;
}

export interface IWorkflowStepRepository {
  deleteById(id: number): Promise<WorkflowStepDto>;
  createWorkflowStep(data: WorkflowStepCreateInputDto): Promise<WorkflowStepDto>;
  updateWorkflowStep(id: number, data: WorkflowStepUpdateInputDto): Promise<WorkflowStepDto>;
}
