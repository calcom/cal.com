import routingFormBookingFormHandler from "@calcom/app-store/salesforce/lib/routingFormBookingFormHandler";

import type { AttributeRoutingConfig } from "./types/types";

type AppBookingFormHandler = (
  attendeeEmail: string,
  attributeRoutingConfig: AttributeRoutingConfig,
  eventTypeId: number
) => Promise<{ email: string | null; recordType: string | null }>;

const appBookingFormHandler: Record<string, AppBookingFormHandler> = {
  salesforce: routingFormBookingFormHandler,
};

export default appBookingFormHandler;
