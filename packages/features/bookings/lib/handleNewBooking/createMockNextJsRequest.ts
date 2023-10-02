import { createMocks } from "node-mocks-http";

import type { CustomNextApiRequest, CustomNextApiResponse } from "./handleNewBooking.test";

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
