import type { z } from "zod";

import { routingFormIncompleteBookingDataSchema as salesforceRoutingFormIncompleteBookingDataSchema } from "@calcom/app-store/salesforce/zod";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";

const incompleteBookingActionDataSchemas: Record<
  IncompleteBookingActionType,
  z.ZodType<Record<string, unknown>>
> = {
  [IncompleteBookingActionType.SALESFORCE]: salesforceRoutingFormIncompleteBookingDataSchema,
};

export default incompleteBookingActionDataSchemas;
