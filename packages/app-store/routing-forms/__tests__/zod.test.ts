import { describe, it, expect } from "vitest";

import { queryValueValidationSchema } from "../zod";

describe("queryValueValidationSchema", () => {
  it("should allow a rule with value", () => {
    const validQueryValue = {
      id: "1",
      type: "group",
      properties: {},
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "equal",
            value: ["John"],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(validQueryValue);
    expect(result.success).toBe(true);
  });

  it("should allow a query value with switch_group type for queryValue", () => {
    const switchGroupQueryValue = {
      id: "2",
      type: "switch_group",
      properties: {},
      children1: {},
    };

    const result = queryValueValidationSchema.safeParse(switchGroupQueryValue);
    expect(result.success).toBe(true);
  });

  it('should allow a possibly invalid query value if the rule type is not "rule" - Goal is to ensure that rule type children1 is correct', () => {
    const switchGroupQueryValue = {
      id: "2",
      type: "switch_group",
      properties: {},
      children1: {
        rule1: {
          type: "abc",
          properties: {
            field: "name",
            operator: "equal",
            value: [],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(switchGroupQueryValue);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid type for queryValue", () => {
    const invalidTypeQueryValue = {
      id: "3",
      type: "invalid_type",
      properties: {},
      children1: {},
    };

    const result = queryValueValidationSchema.safeParse(invalidTypeQueryValue);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["type"]);
    }
  });

  it("should reject a rule with an empty value array", () => {
    const emptyValueQueryValue = {
      id: "4",
      type: "group",
      properties: {},
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "equal",
            value: [],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(emptyValueQueryValue);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toEqual(
        "Looks like you are trying to create a rule with no value"
      );
    }
  });

  it("should reject a rule with just undefined values", () => {
    const emptyValueQueryValue = {
      id: "4",
      type: "group",
      properties: {},
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "equal",
            value: [undefined, undefined],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(emptyValueQueryValue);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toEqual(
        "Looks like you are trying to create a rule with no value"
      );
    }
  });

  it("should allow a rule with null values", () => {
    const nullValueQueryValue = {
      id: "5",
      type: "group",
      properties: {},
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "equal",
            value: [null],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(nullValueQueryValue);
    expect(result.success).toBe(true);
  });

  it("should allow a rule with empty string values", () => {
    const nullValueQueryValue = {
      id: "5",
      type: "group",
      properties: {},
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "equal",
            value: [""],
          },
        },
      },
    };

    const result = queryValueValidationSchema.safeParse(nullValueQueryValue);
    expect(result.success).toBe(true);
  });



  it("should allow omitting the children1 and properties field - e.g. fallback route doesn't have it", () => {
    const queryValueWithoutChildren = {
      id: "6",
      type: "group",
    };

    const result = queryValueValidationSchema.safeParse(queryValueWithoutChildren);
    expect(result.success).toBe(true);
  });
});
