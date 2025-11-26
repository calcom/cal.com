import { describe, it, expect } from "vitest";

import { parseRoutingFormResponse } from "./parseRoutingFormResponse";

describe("parseRoutingFormResponse", () => {
  const validFields = [
    { id: "field-123", label: "E-mail", identifier: "email", type: "text" },
    { id: "field-456", label: "Name", identifier: "name", type: "text" },
  ];

  const validResponse = {
    "field-123": { value: "test@example.com" },
    "field-456": { value: "John Doe" },
  };

  it("parses valid form response and fields", () => {
    const parsed = parseRoutingFormResponse(validResponse, validFields);
    expect(parsed.response["field-123"].value).toBe("test@example.com");
    expect(parsed.fields.length).toBe(2);
  });

  it("handles response with optional label", () => {
    const responseWithLabels = {
      "field-123": { value: "test@example.com", label: "E-mail" },
      "field-456": { value: "John Doe", label: "Name" },
    };

    const parsed = parseRoutingFormResponse(responseWithLabels, validFields);
    expect(parsed.response["field-123"].label).toBe("E-mail");
    expect(parsed.response["field-456"].value).toBe("John Doe");
  });

  it("handles array value in response", () => {
    const multiSelectResponse = {
      "field-789": { value: ["opt1", "opt2"] },
    };

    const multiSelectFields = [
      {
        id: "field-789",
        label: "Options",
        identifier: "options",
        type: "select",
        options: [
          { label: "Option 1", id: "opt1" },
          { label: "Option 2", id: "opt2" },
        ],
      },
    ];

    const parsed = parseRoutingFormResponse(multiSelectResponse, multiSelectFields);
    expect(parsed.response["field-789"].value).toEqual(["opt1", "opt2"]);
  });

  it("throws if response has unexpected field value type", () => {
    const badResponse = {
      "field-123": { value: { nested: true } }, // invalid type
    };

    expect(() => parseRoutingFormResponse(badResponse, validFields)).toThrow();
  });

  it("throws if a field is missing required keys like 'id'", () => {
    const badField = [
      {
        label: "E-mail",
        type: "text",
      },
    ];

    expect(() => parseRoutingFormResponse(validResponse, badField)).toThrow();
  });

  it("allows optional fields like 'selectText' and 'deleted'", () => {
    const optionalField = [
      {
        id: "field-999",
        label: "Optional",
        identifier: "opt",
        type: "text",
        selectText: "Pick one",
        deleted: true,
      },
    ];

    const optionalResponse = {
      "field-999": { value: "Some value" },
    };

    const parsed = parseRoutingFormResponse(optionalResponse, optionalField);
    expect(parsed.fields[0].selectText).toBe("Pick one");
    expect(parsed.fields[0].deleted).toBe(true);
  });

  it("throws if raw inputs are not objects", () => {
    expect(() => parseRoutingFormResponse("not-an-object" as any, validFields)).toThrow();
    expect(() => parseRoutingFormResponse(validResponse, "not-an-array" as any)).toThrow();
  });
});
