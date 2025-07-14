import { describe, it, expect, vi } from "vitest";

import { RoutingFormResponseService } from "./routingFormResponseService";

const mockLogger = {
  error: vi.fn(),
};

describe("RoutingFormResponseService", () => {
  const fields = [
    { id: "field-123", label: "E-mail", identifier: "email", type: "text" },
    { id: "field-456", label: "Name", identifier: "name", type: "text" },
  ];

  const response = {
    ["field-123"]: { value: "test@example.com" },
    ["field-456"]: { value: "John Doe" },
  };

  const service = new RoutingFormResponseService({
    log: mockLogger as any,
    fields,
    response,
  });

  it("returns the correct value for an existing field identifier", async () => {
    const value = await service.findFieldValueByIdentifier("email");
    expect(value).toBe("test@example.com");
  });

  it("throws an error and logs when identifier is not found", async () => {
    const invalidIdentifier = "unknown";

    await expect(service.findFieldValueByIdentifier(invalidIdentifier)).rejects.toThrow(
      `Field with identifier ${invalidIdentifier} not found`
    );

    expect(mockLogger.error).toHaveBeenCalledWith(`Field with identifier ${invalidIdentifier} not found`);
  });
});
