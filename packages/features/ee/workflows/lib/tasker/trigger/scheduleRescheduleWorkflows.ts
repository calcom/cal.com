import { schemaTask } from "@trigger.dev/sdk";

import { workflowTaskConfig } from "./config";
import { workflowTaskSchema } from "./schema";

export const scheduleRescheduleWorkflows = schemaTask({
  id: "workflow.schedule.reschedule",
  ...workflowTaskConfig,
  schema: workflowTaskSchema,
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { BookingRepository } = await import("@calcom/features/bookings/repositories/BookingRepository");
    const { prisma } = await import("@calcom/prisma");
    const { WorkflowTaskService } = await import("../WorkflowTaskService");

    const triggerDevLogger = new TriggerDevLogger();
    const bookingRepo = new BookingRepository(prisma);
    const workflowTaskService = new WorkflowTaskService({
      logger: triggerDevLogger,
      bookingRepository: bookingRepo,
    });
    await workflowTaskService.scheduleRescheduleWorkflows(payload);
  },
});
