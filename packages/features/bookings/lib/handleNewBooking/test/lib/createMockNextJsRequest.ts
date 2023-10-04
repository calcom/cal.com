import { createMocks } from "node-mocks-http";

import type { CustomNextApiRequest, CustomNextApiResponse } from "../new-booking.test";

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
