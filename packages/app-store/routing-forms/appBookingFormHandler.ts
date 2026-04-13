import routingFormBookingFormHandler from "../salesforce/lib/routingFormBookingFormHandler";
import type { AttributeRoutingConfig } from "./types/types";

type AppBookingFormHandler = (
  attendeeEmail: string,
  attributeRoutingConfig: AttributeRoutingConfig,
  eventTypeId: number,
  options?: { hostEmails?: Set<string> }
) => Promise<{ email: string | null; recordType: string | null; recordId: string | null }>;

const appBookingFormHandler: Record<string, AppBookingFormHandler> = {
  salesforce: routingFormBookingFormHandler,
};

export default appBookingFormHandler;
