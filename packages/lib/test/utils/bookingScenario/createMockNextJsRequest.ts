import { createMocks } from "node-mocks-http";

type CustomNextApiRequest = any; // TODO: Define proper type or find alternative
type CustomNextApiResponse = any; // TODO: Define proper type or find alternative

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
