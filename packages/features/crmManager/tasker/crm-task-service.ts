import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { CRMTaskPayload, CRMTasks } from "./types";

export class CRMTaskService implements CRMTasks {
  constructor(
    public readonly dependencies: {
      logger: ITaskerDependencies["logger"];
    }
  ) {}

  async createEvent(payload: CRMTaskPayload): Promise<void> {
    const { logger } = this.dependencies;
    const { bookingUid } = payload;

    try {
      const { createCRMEvent } = await import("@calcom/features/tasker/tasks/crm/createCRMEvent");
      await createCRMEvent(JSON.stringify({ bookingUid }));
      logger.info("Successfully created CRM event", { bookingUid });
    } catch (err) {
      logger.error("Failed to create CRM event", {
        bookingUid,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  }
}
