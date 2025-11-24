import logger from "@calcom/lib/logger";
import type { WorkflowMethods } from "@calcom/prisma/enums";

const workflowLogger = logger.getSubLogger({ prefix: ["managedEventWorkflowReminders"] });

export interface WorkflowReminderRepositoryPort {
  deleteAllWorkflowReminders(reminders: {
    id: number;
    referenceId: string | null;
    method: WorkflowMethods;
  }[]): Promise<void>;
}

interface ManagedEventWorkflowReminderServiceDeps {
  workflowRepository: WorkflowReminderRepositoryPort;
}

export class ManagedEventWorkflowReminderService {
  private readonly workflowRepository: WorkflowReminderRepositoryPort;

  constructor(deps: ManagedEventWorkflowReminderServiceDeps) {
    this.workflowRepository = deps.workflowRepository;
  }

  async cancelWorkflowReminders(workflowReminders: {
    id: number;
    referenceId: string | null;
    method: WorkflowMethods;
  }[]) {
    workflowLogger.info(`Cancelling ${workflowReminders.length} workflow reminders`);

    await this.workflowRepository.deleteAllWorkflowReminders(workflowReminders);

    workflowLogger.info(`Cancelled ${workflowReminders.length} workflow reminders`);

    return {
      cancelledCount: workflowReminders.length,
    };
  }
}

