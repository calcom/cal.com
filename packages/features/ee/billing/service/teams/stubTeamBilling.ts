import type { TeamBilling, TeamBillingInput, TeamBillingPublishResponse } from "./team-billing";
import { TeamBillingPublishResponseStatus } from "./team-billing";

export class StubTeamBilling implements TeamBilling {
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

  async updateQuantity(): Promise<void> {
    // Stub implementation - no-op
  }
}
