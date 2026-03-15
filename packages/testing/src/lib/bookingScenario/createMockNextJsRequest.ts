import { createMocks } from "node-mocks-http";
import type { CustomNextApiRequest, CustomNextApiResponse } from "./types";

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
