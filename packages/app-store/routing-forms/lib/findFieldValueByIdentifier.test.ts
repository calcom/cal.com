import { describe, it, expect } from "vitest";

import { findFieldValueByIdentifier } from "./findFieldValueByIdentifier";
import type { RoutingFormResponseData } from "./responseData/types";

const createMockRoutingFormResponseData = (
  data: Partial<RoutingFormResponseData>
): RoutingFormResponseData => {
  return {
    fields: [],
    response: {},
    ...data,
  } as unknown as RoutingFormResponseData;
};

describe("findFieldValueByIdentifier", () => {
  it("should return success when field is found", () => {
    const data = createMockRoutingFormResponseData({
      fields: [{ id: "name", type: "text", label: "Name" } as any],
      response: { name: { value: "John" } } as any,
    });

    const result = findFieldValueByIdentifier(data, "name");

    expect(result).toEqual({ success: true, data: "John" });
  });

  it("should return error when field is not found", () => {
    const data = createMockRoutingFormResponseData({ fields: [], response: {} as any });

    const result = findFieldValueByIdentifier(data, "nonexistent");

    expect(result).toEqual({ success: false, error: "Field with identifier nonexistent not found" });
  });
});
