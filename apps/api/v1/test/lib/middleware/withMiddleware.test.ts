import { describe, vi, it, expect, afterEach } from "vitest";

import { middlewareOrder } from "../../../lib/helpers/withMiddleware";

afterEach(() => {
  vi.resetAllMocks();
});

// Not sure if there is much point testing this order is actually applied via an integration test:
// It is tested internally https://github.com/htunnicliff/next-api-middleware/blob/368b12aa30e79f4bd7cfe7aacc18da263cc3de2f/lib/label.spec.ts#L62
describe("API - withMiddleware test", () => {
  it("Custom prisma should be before verifyApiKey", async () => {
    const customPrismaClientIndex = middlewareOrder.indexOf("customPrismaClient");
    const verifyApiKeyIndex = middlewareOrder.indexOf("verifyApiKey");
    expect(customPrismaClientIndex).toBeLessThan(verifyApiKeyIndex);
  });
});
