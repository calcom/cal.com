import tasker from "@calcom/features/tasker";

class CRMScheduler {
  static async createEvent({ credentialId, bookingUid }: { credentialId: number; bookingUid: string }) {
    await tasker.create("createCRMEvent", { credentialId, bookingUid });
  }
}

export default CRMScheduler;
