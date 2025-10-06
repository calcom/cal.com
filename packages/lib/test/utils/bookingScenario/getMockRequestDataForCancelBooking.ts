import type z from "zod";

import type { bookingCancelSchema } from "@calcom/prisma/zod-utils";

export function getMockRequestDataForCancelBooking(data: z.infer<typeof bookingCancelSchema>) {
  return data;
}
