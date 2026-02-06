import type { bookingCancelSchema } from "@calcom/prisma/zod-utils";
import type z from "zod";

export function getMockRequestDataForCancelBooking(data: z.infer<typeof bookingCancelSchema>) {
  return data;
}
