import { getEventType } from "../../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../../handleNewBooking/getEventTypesFromDB";

export type EnrichmentBeforeValidationInputContext = {
  eventTypeId: number;
  eventTypeSlug: string;
};

export type EnrichmentBeforeValidationOutputContext = {
  eventType: getEventTypeResponse;
};

export interface IEnrichmentBeforeValidationService {
  validate(context: EnrichmentBeforeValidationInputContext): Promise<EnrichmentBeforeValidationOutputContext>;
}

export class EnrichmentBeforeValidationService implements IEnrichmentBeforeValidationService {
  constructor() {
    return;
  }

  async validate(
    context: EnrichmentBeforeValidationInputContext
  ): Promise<EnrichmentBeforeValidationOutputContext> {
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
