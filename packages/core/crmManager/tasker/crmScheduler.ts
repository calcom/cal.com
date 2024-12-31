import tasker from "@calcom/features/tasker";

class CRMScheduler {
  static async createEvent({ bookingUid }: { bookingUid: string }) {
    return tasker.create("createCRMEvent", JSON.stringify({ bookingUid }));
  }
}

export default CRMScheduler;
