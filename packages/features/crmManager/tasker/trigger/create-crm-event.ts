import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { crmTaskConfig } from "./config";
import { createCRMEventTaskSchema } from "./schema";

export const CREATE_CRM_EVENT_JOB_ID = "crm.create-event";

export const createCRMEventTask: TaskWithSchema<
  typeof CREATE_CRM_EVENT_JOB_ID,
  typeof createCRMEventTaskSchema
> = schemaTask({
  id: CREATE_CRM_EVENT_JOB_ID,
  ...crmTaskConfig,
  schema: createCRMEventTaskSchema,
  run: async (payload: z.infer<typeof createCRMEventTaskSchema>) => {
    const { getCRMTaskService } = await import(
      "@calcom/features/crmManager/di/tasker/crm-task-service.container"
    );

    const crmTaskService = getCRMTaskService();
    await crmTaskService.createEvent(payload);
  },
});
