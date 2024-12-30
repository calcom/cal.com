import tasker from "@calcom/features/tasker";
import type { CalendarEvent } from "@calcom/types/Calendar";

class CRMScheduler {
  static async createEvent({ credentialId, event }: { credentialId: number; event: CalendarEvent }) {
    return tasker.create("createCRMEvent", JSON.stringify({ credentialId, event }));
  }
}

export default CRMScheduler;
