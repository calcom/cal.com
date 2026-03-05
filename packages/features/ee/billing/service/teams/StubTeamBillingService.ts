import type { SeatChangeType } from "../seatBillingStrategy/ISeatBillingStrategy";
import type {
  ITeamBillingService,
  TeamBillingInput,
  TeamBillingPublishResponse,
} from "./ITeamBillingService";
import { TeamBillingPublishResponseStatus } from "./ITeamBillingService";

export class StubTeamBillingService implements ITeamBillingService {
  constructor(private team: TeamBillingInput) {}

  async cancel(): Promise<void> {
    // Stub implementation - no-op
  }

  async publish(): Promise<TeamBillingPublishResponse> {
    return {
      redirectUrl: null,
      status: TeamBillingPublishResponseStatus.SUCCESS,
    };
  }

  async downgrade(): Promise<void> {
    // Stub implementation - no-op
  }

  async updateQuantity(_changeType: SeatChangeType): Promise<void> {
    // Stub implementation - no-op
  }

  async getSubscriptionStatus() {
    return null;
  }

  async endTrial() {
    return true;
  }

  async saveTeamBilling() {}

  async resubscribe(_userId: number): Promise<{ checkoutUrl: string }> {
    return { checkoutUrl: "" };
  }
}
