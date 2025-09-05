import type {
  CustomNextApiRequest,
  CustomNextApiResponse,
} from "@calcom/features/bookings/lib/handleNewBooking/test/fresh-booking.test";
import { createMocks } from "node-mocks-http";

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
