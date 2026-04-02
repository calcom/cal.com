import { describe, expect, it } from "vitest";
import { findFieldValueByIdentifier } from "./findFieldValueByIdentifier";
import type { RoutingFormResponseData } from "./responseData/types";

describe("findFieldValueByIdentifier", () => {
  const responseData: RoutingFormResponseData = {
    response: {
      "field-123": { value: "test@example.com" },
      "field-456": { value: "John Doe" },
    },
    fields: [
      { id: "field-123", label: "E-mail", identifier: "email", type: "text" },
      { id: "field-456", label: "Name", identifier: "name", type: "text" },
    ],
  };

  it("returns the correct value for an existing field identifier", async () => {
    const result = findFieldValueByIdentifier(responseData, "email");
    expect(result.success).toBe(true);
    // @ts-expect-error we know data is defined here
    expect(result.data).toBe("test@example.com");
  });

  it("throws an error and logs when identifier is not found", () => {
    const invalidIdentifier = "unknown";

    const result = findFieldValueByIdentifier(responseData, invalidIdentifier);
    expect(result.success).toBe(false);
    // @ts-expect-error we know error is defined here
    expect(result.error).toBe(`Field with identifier ${invalidIdentifier} not found`);
  });
});
