import { tasksConfig } from "@calcom/features/tasker/tasks";
import { createCRMEventTask } from "@calcom/features/tasker/tasks/createCRMEventTask";

class CRMScheduler {
  static async createEvent({ bookingUid }: { bookingUid: string }) {
    return createCRMEventTask({ bookingUid }, { maxAttempts: tasksConfig.createCRMEvent?.maxAttempts ?? 5 });
  }
}

export default CRMScheduler;
