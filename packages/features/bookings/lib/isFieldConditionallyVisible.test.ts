import { describe, expect, it } from "vitest";

import { isFieldConditionallyVisible, validateConditionalFields } from "./isFieldConditionallyVisible";

describe("isFieldConditionallyVisible", () => {
  it("should return true for fields without conditionalOn", () => {
    const field = {
      name: "name",
      type: "name" as const,
      required: true,
      editable: "user" as const,
    };

    expect(isFieldConditionallyVisible(field, {})).toBe(true);
    expect(isFieldConditionallyVisible(field, { otherField: "value" })).toBe(true);
  });

  it("should return false when parent field has no value", () => {
    const field = {
      name: "follow-up",
      type: "text" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "parent",
        showWhenParentValues: "yes",
      },
    };

    expect(isFieldConditionallyVisible(field, {})).toBe(false);
    expect(isFieldConditionallyVisible(field, { parent: null })).toBe(false);
    expect(isFieldConditionallyVisible(field, { parent: undefined })).toBe(false);
    expect(isFieldConditionallyVisible(field, { parent: "" })).toBe(false);
  });

  it("should return true when parent value matches single showWhenParentValues", () => {
    const field = {
      name: "website",
      type: "text" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "how-did-you-hear",
        showWhenParentValues: "Web",
      },
    };

    expect(isFieldConditionallyVisible(field, { "how-did-you-hear": "Web" })).toBe(true);
    expect(isFieldConditionallyVisible(field, { "how-did-you-hear": "web" })).toBe(false);
    expect(isFieldConditionallyVisible(field, { "how-did-you-hear": "Print" })).toBe(false);
  });

  it("should return true when parent value matches one of multiple showWhenParentValues", () => {
    const field = {
      name: "phone-number",
      type: "phone" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "contact-method",
        showWhenParentValues: ["Phone", "SMS", "WhatsApp"],
      },
    };

    expect(isFieldConditionallyVisible(field, { "contact-method": "Phone" })).toBe(true);
    expect(isFieldConditionallyVisible(field, { "contact-method": "SMS" })).toBe(true);
    expect(isFieldConditionallyVisible(field, { "contact-method": "WhatsApp" })).toBe(true);
    expect(isFieldConditionallyVisible(field, { "contact-method": "Email" })).toBe(false);
  });

  it("should return true when parent array contains matching value for string trigger", () => {
    const field = {
      name: "contact-phone",
      type: "phone" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "contact-methods",
        showWhenParentValues: "Phone",
      },
    };

    expect(
      isFieldConditionallyVisible(field, { "contact-methods": ["Phone", "SMS"] })
    ).toBe(true);
    expect(isFieldConditionallyVisible(field, { "contact-methods": ["Email"] })).toBe(false);
  });

  it("should return true when parent array contains any of multiple triggers", () => {
    const field = {
      name: "contact-phone",
      type: "phone" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "contact-methods",
        showWhenParentValues: ["Phone", "SMS", "WhatsApp"],
      },
    };

    expect(
      isFieldConditionallyVisible(field, { "contact-methods": ["Email", "SMS"] })
    ).toBe(true);
    expect(isFieldConditionallyVisible(field, { "contact-methods": ["Email", "Fax"] })).toBe(false);
  });

  it("should handle non-string parent values", () => {
    const field = {
      name: "details",
      type: "text" as const,
      required: true,
      editable: "user" as const,
      conditionalOn: {
        parentFieldName: "count",
        showWhenParentValues: "5",
      },
    };

    expect(isFieldConditionallyVisible(field, { count: 5 })).toBe(true);
    expect(isFieldConditionallyVisible(field, { count: "5" })).toBe(true);
    expect(isFieldConditionallyVisible(field, { count: 3 })).toBe(false);
  });
});

describe("validateConditionalFields", () => {
  it("should return no errors for valid configuration", () => {
    const fields = [
      {
        name: "parent",
        type: "select" as const,
        required: true,
        editable: "user" as const,
        options: [{ label: "Yes", value: "yes" }],
      },
      {
        name: "child",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "parent",
          showWhenParentValues: "yes",
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors).toEqual([]);
  });

  it("should detect non-existent parent field", () => {
    const fields = [
      {
        name: "child",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "non-existent",
          showWhenParentValues: "yes",
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors).toContain(
      'Field "child" references non-existent parent field "non-existent"'
    );
  });

  it("should detect self-referencing field", () => {
    const fields = [
      {
        name: "self-ref",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "self-ref",
          showWhenParentValues: "yes",
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors).toContain('Field "self-ref" cannot be conditional on itself');
  });

  it("should detect empty showWhenParentValues array", () => {
    const fields = [
      {
        name: "parent",
        type: "select" as const,
        required: true,
        editable: "user" as const,
      },
      {
        name: "child",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "parent",
          showWhenParentValues: [],
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors).toContain('Field "child" has empty showWhenParentValues');
  });

  it("should detect circular dependencies", () => {
    const fields = [
      {
        name: "field1",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "field2",
          showWhenParentValues: "yes",
        },
      },
      {
        name: "field2",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "field1",
          showWhenParentValues: "yes",
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("Circular dependency"))).toBe(true);
  });

  it("should allow multiple fields conditional on same parent", () => {
    const fields = [
      {
        name: "parent",
        type: "radio" as const,
        required: true,
        editable: "user" as const,
        options: [{ label: "Yes", value: "yes" }],
      },
      {
        name: "child1",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "parent",
          showWhenParentValues: "yes",
        },
      },
      {
        name: "child2",
        type: "text" as const,
        required: true,
        editable: "user" as const,
        conditionalOn: {
          parentFieldName: "parent",
          showWhenParentValues: "yes",
        },
      },
    ];

    const errors = validateConditionalFields(fields);
    expect(errors).toEqual([]);
  });
});
