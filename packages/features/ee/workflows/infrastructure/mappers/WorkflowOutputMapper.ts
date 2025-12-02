import type {
  Workflow as PrismaWorkflow,
  WorkflowStep as PrismaWorkflowStep,
  WorkflowReminder as PrismaWorkflowReminder,
} from "@calcom/prisma/client";

import type { Workflow, WorkflowStep, WorkflowReminder } from "../../domain/models/Workflow";
import type { TimeUnit, WorkflowTriggerEvents, WorkflowActions } from "../../domain/types";

// Use structural typing to accept any workflow object with steps
// This works around the Prisma extension type narrowing issue
type WorkflowWithSteps = PrismaWorkflow & { steps: PrismaWorkflowStep[] };

/**
 * Maps Prisma models to domain models
 * Following PBAC's RoleOutputMapper pattern
 */
export class WorkflowOutputMapper {
  static toDomain(prismaWorkflow: WorkflowWithSteps): Workflow {
    return {
      id: prismaWorkflow.id,
      position: prismaWorkflow.position,
      name: prismaWorkflow.name,
      userId: prismaWorkflow.userId || undefined,
      teamId: prismaWorkflow.teamId || undefined,
      isActiveOnAll: prismaWorkflow.isActiveOnAll,
      trigger: prismaWorkflow.trigger as WorkflowTriggerEvents,
      time: prismaWorkflow.time || undefined,
      timeUnit: (prismaWorkflow.timeUnit as TimeUnit) || undefined,
      // Type field omitted - Prisma extensions narrow the return type
      // and don't guarantee this field is available in the inferred type.
      // The field exists at runtime but TypeScript can't see it due to
      // the extension casting in packages/prisma/index.ts
      steps: prismaWorkflow.steps.map(WorkflowOutputMapper.toDomainStep),
    };
  }

  static toDomainStep(prismaStep: PrismaWorkflowStep): WorkflowStep {
    return {
      id: prismaStep.id,
      stepNumber: prismaStep.stepNumber,
      action: prismaStep.action as WorkflowActions,
      workflowId: prismaStep.workflowId,
      sendTo: prismaStep.sendTo || undefined,
      reminderBody: prismaStep.reminderBody || undefined,
      emailSubject: prismaStep.emailSubject || undefined,
      template: prismaStep.template,
      includeCalendarEvent: prismaStep.includeCalendarEvent,
      sender: prismaStep.sender || undefined,
      numberRequired: prismaStep.numberRequired || undefined,
      numberVerificationPending: prismaStep.numberVerificationPending,
    };
  }

  static toDomainReminder(prismaReminder: PrismaWorkflowReminder): WorkflowReminder {
    return {
      id: prismaReminder.id,
      bookingUid: prismaReminder.bookingUid || undefined,
      method: prismaReminder.method,
      scheduledDate: prismaReminder.scheduledDate,
      referenceId: prismaReminder.referenceId || undefined,
      scheduled: prismaReminder.scheduled,
      workflowStepId: prismaReminder.workflowStepId || undefined,
      cancelled: prismaReminder.cancelled || undefined,
      seatReferenceId: prismaReminder.seatReferenceId || undefined,
    };
  }

  static toDomainList(prismaWorkflows: WorkflowWithSteps[]): Workflow[] {
    return prismaWorkflows.map(WorkflowOutputMapper.toDomain);
  }
}
