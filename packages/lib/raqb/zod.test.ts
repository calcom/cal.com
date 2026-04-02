import { describe, expect, it } from "vitest";
import { raqbQueryValueSchema } from "./zod";

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
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(validQueryValue);
    expect(result.success).toBe(true);
  });

  it("should save valueType", () => {
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
            valueSrc: ["value"],
            valueType: ["select"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(validQueryValue);
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Failed to parse query value");
    }
    expect(result.data?.children1?.rule1?.properties.valueType).toEqual(["select"]);
  });

  it("should allow a query value with switch_group type for queryValue", () => {
    const switchGroupQueryValue = {
      id: "2",
      type: "switch_group",
      properties: {},
      children1: {},
    };

    const result = raqbQueryValueSchema.safeParse(switchGroupQueryValue);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid type for queryValue", () => {
    const invalidTypeQueryValue = {
      id: "3",
      type: "invalid_type",
      properties: {},
      children1: {},
    };

    const result = raqbQueryValueSchema.safeParse(invalidTypeQueryValue);
    expect(result.success).toBe(false);
    if (!result.success) {
      // @ts-expect-error - TODO: unionErrors is available sometimes and it is available in this case.
      expect(result.error.issues[0].unionErrors[0].issues[0].path).toEqual(["type"]);
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
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(emptyValueQueryValue);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toEqual(
        "Looks like you are trying to create a rule with no value"
      );
    }
  });

  it("should reject a rule with 2D empty value array", () => {
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
            value: [[]],
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(emptyValueQueryValue);
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
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(emptyValueQueryValue);
    expect(result.success).toBe(false);
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
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(nullValueQueryValue);
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
            valueSrc: ["value"],
          },
        },
      },
    };

    const result = raqbQueryValueSchema.safeParse(nullValueQueryValue);
    expect(result.success).toBe(true);
  });

  it("should allow omitting the children1 and properties field - e.g. fallback route doesn't have it", () => {
    const queryValueWithoutChildren = {
      id: "6",
      type: "group",
    };

    const result = raqbQueryValueSchema.safeParse(queryValueWithoutChildren);
    expect(result.success).toBe(true);
  });

  it("should allow fields with no value if valueSrc is empty", () => {
    const result = raqbQueryValueSchema.safeParse({
      id: "7",
      type: "group",
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "is_empty",
            value: [],
            valueSrc: [],
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should not allow fields with no value if valueSrc is not empty", () => {
    const result = raqbQueryValueSchema.safeParse({
      id: "7",
      type: "group",
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "name",
            operator: "is_empty",
            value: [],
            valueSrc: ["value"],
          },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("should allow properties in the query that has rule grouping details", () => {
    const result = raqbQueryValueSchema.parse({
      id: "8",
      type: "group",
      properties: {
        not: false,
        conjunction: "OR",
      },
    });
    expect(result.properties.not).toBe(false);
    expect(result.properties.conjunction).toBe("OR");
  });
});
