import { createMocks } from "node-mocks-http";

import type {
  CustomNextApiRequest,
  CustomNextApiResponse,
} from "@calcom/features/bookings/lib/handleNewBooking/test/fresh-booking.test";

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
