import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyWorkflowReminderRepository } from "../../ee/workflows/repositories/KyselyWorkflowReminderRepository";
import { DI_TOKENS } from "../tokens";

export function workflowReminderRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.WORKFLOW_REMINDER_REPOSITORY).toValue(new KyselyWorkflowReminderRepository(kyselyRead, kyselyWrite));
  };
}
