import { getCRMTasker } from "@calcom/features/crmManager/di/tasker/crm-tasker.container";

class CRMScheduler {
  static async createEvent({ bookingUid }: { bookingUid: string }) {
    const crmTasker = getCRMTasker();
    return crmTasker.createEvent({ payload: { bookingUid } });
  }
}

export default CRMScheduler;
