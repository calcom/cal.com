import type z from "zod";

import type { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";

export function getMockRequestDataForCancelBooking(data: z.infer<typeof schemaBookingCancelParams>) {
  return data;
}
