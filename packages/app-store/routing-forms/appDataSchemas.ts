import { routingFormOptions as hubspot_routing_form_schema } from "../hubspot/zod";
import { routingFormOptions as salesforce_routing_form_schema } from "../salesforce/zod";

export const routingFormAppDataSchemas = {
  salesforce: salesforce_routing_form_schema,
  hubspot: hubspot_routing_form_schema,
};
