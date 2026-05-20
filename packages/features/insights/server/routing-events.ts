// Routing forms have been removed from this fork.
// These are stub implementations that return empty data.

type RoutingFormForFilters = {
  id: string;
  name: string;
  _count: {
    responses: number;
  };
};

type RoutingFormHeaderRow = {
  id: string;
  label: string;
  type: string;
  options: { id: string | null; label: string }[] | null;
};

class RoutingEventsInsightsStub {
  static async getRoutingFormsForFilters(_input: unknown) {
    return [] as RoutingFormForFilters[];
  }

  static async getRoutingFormHeaders(_input: unknown): Promise<RoutingFormHeaderRow[]> {
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
