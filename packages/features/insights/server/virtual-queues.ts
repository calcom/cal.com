// Routing forms and virtual queues have been removed from this fork.
// These are stub implementations that return empty data.

class VirtualQueuesInsightsStub {
  static async getUserRelevantTeamRoutingForms(_input: { userId: number }) {
    return [];
  }
}

export const VirtualQueuesInsights = VirtualQueuesInsightsStub;
