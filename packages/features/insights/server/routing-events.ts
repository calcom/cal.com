// Routing forms have been removed from this fork.
// These are stub implementations that return empty data.

class RoutingEventsInsightsStub {
  static async getRoutingFormsForFilters(_input: unknown) {
    return [];
  }

  static async getRoutingFormHeaders(_input: unknown) {
    return [];
  }

  static async getRoutingFormPaginatedResponsesForDownload(_input: unknown) {
    return { data: [], total: 0 };
  }

  static async getRoutingFormFieldOptions(_input: unknown) {
    return [];
  }
}

export const RoutingEventsInsights = RoutingEventsInsightsStub;
