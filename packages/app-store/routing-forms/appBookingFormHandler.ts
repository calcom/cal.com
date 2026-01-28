import routingFormBookingFormHandler from "../salesforce/lib/routingFormBookingFormHandler";
import type { CrmRoutingTraceService } from "@calcom/features/routing-trace/services/CrmRoutingTraceService";
import type { AttributeRoutingConfig } from "./types/types";

type AppBookingFormHandler = (
  attendeeEmail: string,
  attributeRoutingConfig: AttributeRoutingConfig,
  eventTypeId: number,
  crmTrace?: CrmRoutingTraceService
) => Promise<{ email: string | null; recordType: string | null; recordId: string | null }>;

const appBookingFormHandler: Record<string, AppBookingFormHandler> = {
  salesforce: routingFormBookingFormHandler,
};

export default appBookingFormHandler;
