import type { z } from "zod";

import { routingFormIncompleteBookingDataSchema as salesforceRoutingFormIncompleteBookingDataSchema } from "@calcom/app-store/salesforce/zod";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";

const incompleteBookingActionDataSchemas: Record<IncompleteBookingActionType, z.ZodType<any>> = {
  [IncompleteBookingActionType.SALESFORCE]: salesforceRoutingFormIncompleteBookingDataSchema,
};

export default incompleteBookingActionDataSchemas;
