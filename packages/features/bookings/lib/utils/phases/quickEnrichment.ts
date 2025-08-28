import { getEventType } from "../../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../../handleNewBooking/getEventTypesFromDB";

export type QuickEnrichmentInputContext = {
  eventTypeId: number;
  eventTypeSlug: string;
};

export type QuickEnrichmentOutputContext = {
  eventType: getEventTypeResponse;
};

export interface IQuickEnrichmentService {
  enrich(context: QuickEnrichmentInputContext): Promise<QuickEnrichmentOutputContext>;
}

export class QuickEnrichmentService implements IQuickEnrichmentService {
  constructor() {
    return;
  }

  async enrich(context: QuickEnrichmentInputContext): Promise<QuickEnrichmentOutputContext> {
    const eventType = await getEventType({
      eventTypeId: context.eventTypeId,
      eventTypeSlug: context.eventTypeSlug,
    });

    if (!eventType) {
      throw new Error("Event type not found");
    }

    return {
      eventType,
    };
  }
}
