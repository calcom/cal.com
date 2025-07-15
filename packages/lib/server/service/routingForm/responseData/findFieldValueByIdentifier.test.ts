import { describe, it, expect } from "vitest";

import { findFieldValueByIdentifier } from "./findFieldValueByIdentifier";
import type { RoutingFormResponseData } from "./types";

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
    const value = findFieldValueByIdentifier(responseData, "email");
    expect(value).toBe("test@example.com");
  });

  it("throws an error and logs when identifier is not found", () => {
    const invalidIdentifier = "unknown";

    expect(() => findFieldValueByIdentifier(responseData, invalidIdentifier)).toThrow(
      `Field with identifier ${invalidIdentifier} not found`
    );
  });
});
