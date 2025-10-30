import { TeamBillingPublishResponseStatus } from "./teamBillingService.interface";
import type {
  TeamBillingService,
  TeamBillingInput,
  TeamBillingPublishResponse,
} from "./teamBillingService.interface";

export class StubTeamBillingService implements TeamBillingService {
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
