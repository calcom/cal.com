import { routingFormIncompleteBookingDataSchema as salesforceRoutingFormIncompleteBookingDataSchema } from "@calcom/app-store/salesforce/zod";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";
import type { z } from "zod";

const incompleteBookingActionDataSchemas: Record<IncompleteBookingActionType, z.ZodType<any>> = {
  [IncompleteBookingActionType.SALESFORCE]: salesforceRoutingFormIncompleteBookingDataSchema,
};

export default incompleteBookingActionDataSchemas;
