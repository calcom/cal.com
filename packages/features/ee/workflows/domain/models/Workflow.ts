import type { TimeUnit, WorkflowTriggerEvents, WorkflowType, WorkflowActions } from "../types";

// Domain model - independent of Prisma
// Represents a workflow in the business domain
export interface Workflow {
  id: number;
  position: number;
  name: string;
  userId?: number;
  teamId?: number;
  isActiveOnAll: boolean;
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  type?: WorkflowType;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo?: string;
  reminderBody?: string;
  emailSubject?: string;
  template: string;
  workflowReminders?: WorkflowReminder[];
  includeCalendarEvent: boolean;
  sender?: string;
  numberRequired?: boolean;
  numberVerificationPending: boolean;
}

export interface WorkflowReminder {
  id: number;
  bookingUid?: string;
  method: string;
  scheduledDate: Date;
  referenceId?: string;
  scheduled: boolean;
  workflowStepId?: number;
  cancelled?: boolean;
  seatReferenceId?: string;
}

// Value Objects for creating/updating workflows
export interface CreateWorkflowData {
  name: string;
  userId?: number;
  teamId?: number;
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  isActiveOnAll?: boolean;
  type?: WorkflowType;
}

export interface UpdateWorkflowData {
  name?: string;
  trigger?: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  isActiveOnAll?: boolean;
}

export interface CreateWorkflowStepData {
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo?: string;
  reminderBody?: string;
  emailSubject?: string;
  template: string;
  includeCalendarEvent?: boolean;
  sender?: string;
  numberRequired?: boolean;
}
