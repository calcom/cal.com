/**
 * Workflow DTOs - Data Transfer Objects for workflow data
 */

import type { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

/**
 * Workflow step information
 * Compatible with @calcom/features/ee/workflows/lib/types.WorkflowStep
 */
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

/**
 * Workflow information
 * Compatible with @calcom/features/ee/workflows/lib/types.Workflow
 */
export interface WorkflowDto {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStepDto[];
}

/**
 * Workflow on event type wrapper
 */
export interface WorkflowOnEventTypeDto {
  workflow: WorkflowDto;
}
