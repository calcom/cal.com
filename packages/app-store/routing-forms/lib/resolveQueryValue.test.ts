import { expect, describe, it } from "vitest";

import { RoutingFormFieldType } from "@calcom/app-store/routing-forms/lib/FieldTypes";
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import type { AttributesQueryValue, RaqbChild } from "@calcom/lib/raqb/types";
import { AttributeType } from "@calcom/prisma/enums";

import { resolveQueryValue } from "./resolveQueryValue";

// Test Data Builders for AttributesQueryValue
const createQueryValueRule = (overrides?: Partial<RaqbChild>): RaqbChild => ({
  type: "rule",
  properties: {
    field: "default-field",
    operator: "select_equals",
    value: ["default-value"],
    valueSrc: ["value"],
    valueError: [null],
    valueType: ["select"],
  },
  ...overrides,
});

const createAttributesQueryValue = (overrides?: {
  id?: string;
  type?: "group" | "switch_group";
  children1?: Record<string, RaqbChild>;
  properties?: any;
}): AttributesQueryValue => ({
  id: overrides?.id || "test-id",
  type: overrides?.type || "group",
  children1: overrides?.children1 || {},
  properties: overrides?.properties,
});

const createQueryValueWithRule = ({
  ruleId,
  field,
  operator,
  value,
  valueSrc = ["value"],
  valueError = [null],
  valueType = ["select"],
}: {
  ruleId: string;
  field: string;
  operator: string;
  value: any[];
  valueSrc?: string[];
  valueError?: (string | null)[];
  valueType?: string[];
}): AttributesQueryValue => {
  return createAttributesQueryValue({
    children1: {
      [ruleId]: createQueryValueRule({
        type: "rule",
        properties: {
          field,
          operator,
          value,
          valueSrc,
          valueError,
          valueType,
        },
      }),
    },
  });
};

const createComplexQueryValue = ({
  id,
  rules,
}: {
  id?: string;
  rules: Array<{
    ruleId: string;
    field: string;
    operator: string;
    value: any[];
    valueSrc?: string[];
    valueError?: (string | null)[];
    valueType?: string[];
  }>;
}): AttributesQueryValue => {
  const children1: Record<string, RaqbChild> = {};

  rules.forEach((rule) => {
    children1[rule.ruleId] = createQueryValueRule({
      type: "rule",
      properties: {
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        valueSrc: rule.valueSrc || ["value"],
        valueError: rule.valueError || [null],
        valueType: rule.valueType || ["select"],
      },
    });
  });

  return createAttributesQueryValue({
    id,
    children1,
  });
};

const createNestedGroupQueryValue = ({
  groups,
}: {
  groups: Array<{
    groupId: string;
    rules: Array<{
      ruleId: string;
      field: string;
      operator?: string;
      value: any[];
      valueSrc?: string[];
      valueError?: (string | null)[];
      valueType?: string[];
    }>;
  }>;
}): AttributesQueryValue => {
  const children1: Record<string, RaqbChild> = {};

  groups.forEach((group) => {
    const groupChildren: Record<string, RaqbChild> = {};

    group.rules.forEach((rule) => {
      groupChildren[rule.ruleId] = createQueryValueRule({
        type: "rule",
        properties: {
          field: rule.field,
          operator: rule.operator || "select_equals",
          value: rule.value,
          valueSrc: rule.valueSrc || ["value"],
          valueError: rule.valueError || [null],
          valueType: rule.valueType || ["select"],
        },
      });
    });

    children1[group.groupId] = {
      type: "group",
      children1: groupChildren,
    } as RaqbChild;
  });

  return createAttributesQueryValue({
    type: "group",
    children1,
  });
};

describe("resolveQueryValue", () => {
  const mockFields = [
    {
      id: "location",
      type: RoutingFormFieldType.MULTI_SELECT,
      label: "Location",
      options: [
        { id: "delhi", label: "Delhi" },
        { id: "mumbai", label: "Mumbai" },
        { id: "paris", label: "Paris" },
        { id: "berlin", label: "Berlin" },
        { id: "new-york", label: "New York" },
        { id: "amsterdam", label: "Amsterdam" },
        { id: "haryana", label: "Haryana" },
        { id: "tokyo", label: "Tokyo" },
        { id: "chennai", label: "Chennai" },
        { id: "sao-paulo", label: "São Paulo" },
        { id: "zurich", label: "Zürich" },
      ],
    },
    {
      id: "city",
      type: RoutingFormFieldType.SINGLE_SELECT,
      label: "City",
      options: [
        { id: "mumbai", label: "Mumbai" },
        { id: "delhi", label: "Delhi" },
        { id: "chennai", label: "Chennai" },
        { id: "tokyo", label: "Tokyo" },
      ],
    },
  ];

  // Mock attributes for testing
  const mockAttributes: Attribute[] = [
    {
      id: "attr-1",
      name: "Location",
      slug: "location",
      type: AttributeType.MULTI_SELECT,
      options: [
        { id: "opt-1", value: "New York", slug: "new-york" },
        { id: "opt-2", value: "London", slug: "london" },
      ],
    },
    {
      id: "attr-2",
      name: "City",
      slug: "city",
      type: AttributeType.SINGLE_SELECT,
      options: [
        { id: "opt-3", value: "Mumbai", slug: "mumbai" },
        { id: "opt-4", value: "Delhi", slug: "delhi" },
      ],
    },
  ];

  describe("attribute option ID to label conversion for field matching", () => {
    /**
     * These tests verify that attribute option IDs are replaced with their lowercase labels
     * to enable comparison with form field values that are connected through "Value of Field".
     * Labels are converted to lowercase to ensure case-insensitive matching between
     * attribute options and field values.
     */
    it("converts single option ID to lowercase label", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "select_equals",
        value: ["opt-1"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                field: "attr-1",
                operator: "select_equals",
                value: ["new york"], // opt-1 -> "New York" -> "new york" for field matching
              }),
            },
          },
        })
      );
    });

    it("converts multiple option IDs to labels in multiselect", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "multiselect_some_in",
        value: [["opt-1", "opt-2", "opt-3", "opt-4"]],
        valueType: ["multiselect"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                field: "attr-1",
                operator: "multiselect_some_in",
                value: [["new york", "london", "mumbai", "delhi"]], // All IDs converted to lowercase labels
              }),
            },
          },
        })
      );
    });

    it("converts option IDs across multiple rules", () => {
      const queryValue = createComplexQueryValue({
        rules: [
          {
            ruleId: "rule1",
            field: "attr-1",
            operator: "select_equals",
            value: ["opt-1"],
          },
          {
            ruleId: "rule2",
            field: "attr-2",
            operator: "select_equals",
            value: ["opt-3"],
          },
        ],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["new york"], // opt-1 converted to label
              }),
            },
            rule2: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["mumbai"], // opt-3 converted to label
              }),
            },
          },
        })
      );
    });

    it("converts option IDs before field template resolution", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "multiselect_some_in",
        value: [["opt-1", "{field:location}"]],
        valueType: ["multiselect"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: {
          fields: mockFields,
          response: {
            location: { value: ["Paris"], label: "Paris" },
          },
        },
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: [["new york", "paris"]], // Option ID converted first, then field template resolved
              }),
            },
          },
        })
      );
    });

    it("preserves special chars in labels while lowercasing", () => {
      const specialAttributes: Attribute[] = [
        {
          id: "attr-special",
          name: "Special",
          slug: "special",
          type: AttributeType.SINGLE_SELECT,
          options: [
            { id: "opt-special-1", value: "São Paulo", slug: "sao-paulo" },
            { id: "opt-special-2", value: "Zürich", slug: "zurich" },
          ],
        },
      ];

      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-special",
        operator: "select_equals",
        value: ["opt-special-1"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: specialAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["são paulo"], // Special chars preserved, only case changed for matching
              }),
            },
          },
        })
      );
    });

    it("keeps non-matching IDs unchanged", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "select_equals",
        value: ["non-existent-id", "opt-1"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["non-existent-id", "new york"], // Unknown IDs kept, valid ones converted
              }),
            },
          },
        })
      );
    });

    it("handles missing attributes gracefully", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "select_equals",
        value: ["opt-1"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: [], // No attributes
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["opt-1"], // No attributes to resolve against
              }),
            },
          },
        })
      );
    });

    it("handles attributes without options", () => {
      const attributesWithoutOptions: Attribute[] = [
        {
          id: "attr-no-options",
          name: "No Options",
          slug: "no-options",
          type: AttributeType.TEXT,
          options: [], // Empty options array
        },
      ];

      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-no-options",
        operator: "text_equals",
        value: ["some-value"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: attributesWithoutOptions,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: ["some-value"], // TEXT attributes don't have options to convert
              }),
            },
          },
        })
      );
    });

    it("converts IDs in nested group structures", () => {
      const queryValue = createNestedGroupQueryValue({
        groups: [
          {
            groupId: "group1",
            rules: [
              {
                ruleId: "rule1",
                field: "attr-1",
                operator: "multiselect_some_in",
                value: [["opt-1", "opt-2"]],
                valueType: ["multiselect"],
              },
              {
                ruleId: "rule2",
                field: "attr-2",
                operator: "select_equals",
                value: ["opt-3"],
              },
            ],
          },
        ],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: undefined,
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            group1: {
              type: "group",
              children1: {
                rule1: {
                  type: "rule",
                  properties: expect.objectContaining({
                    value: [["new york", "london"]], // opt-1, opt-2 converted to labels
                  }),
                },
                rule2: {
                  type: "rule",
                  properties: expect.objectContaining({
                    value: ["mumbai"], // opt-3 converted to label
                  }),
                },
              },
            },
          },
        })
      );
    });

    it("converts IDs alongside field templates in arrays", () => {
      const queryValue = createQueryValueWithRule({
        ruleId: "rule1",
        field: "attr-1",
        operator: "multiselect_some_in",
        value: [["opt-1", "{field:city}", "opt-2", "{field:location}"]],
        valueType: ["multiselect"],
      });

      const result = resolveQueryValue({
        queryValue,
        dynamicFieldValueOperands: {
          fields: mockFields,
          response: {
            city: { value: "Tokyo", label: "Tokyo" },
            location: { value: ["Berlin", "Paris"], label: "Berlin, Paris" },
          },
        },
        attributes: mockAttributes,
      });

      expect(result).toEqual(
        expect.objectContaining({
          children1: {
            rule1: {
              type: "rule",
              properties: expect.objectContaining({
                value: [["new york", "tokyo", "london", "berlin", "paris"]], // opt-1->"new york", opt-2->"london", field templates resolved
              }),
            },
          },
        })
      );
    });
  });

  it("should handle simple field template replacement with single value", () => {
    const queryValue = createQueryValueWithRule({
      ruleId: "a8a89bba",
      field: "city",
      operator: "select_equals",
      value: ["{field:city}"],
    });

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { label: "Mumbai", value: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          a8a89bba: {
            type: "rule",
            properties: expect.objectContaining({
              field: "city",
              operator: "select_equals",
              value: ["mumbai"],
            }),
          },
        },
      })
    );
  });

  it("should handle field template in double-nested array for multiselect", () => {
    const queryValue = createQueryValueWithRule({
      ruleId: "rule1",
      field: "location",
      operator: "multiselect_some_in",
      value: [["{field:location}"]],
      valueType: ["multiselect"],
    });

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { label: "Delhi", value: "Delhi" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: expect.objectContaining({
              field: "location",
              operator: "multiselect_some_in",
              value: [["delhi"]],
            }),
          },
        },
      })
    );
  });

  it("should handle mixed array with field template and regular values", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            operator: "multiselect_some_in",
            value: [["{field:location}", "Chennai"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: "Delhi", label: "Delhi" }, // Single value, not array
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              operator: "multiselect_some_in",
              value: [["delhi", "Chennai"]], // Single value replaced
            },
          },
        },
      })
    );
  });

  it("should handle multiple field templates in the same array", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "multifield",
            operator: "multiselect_some_in",
            value: [["{field:location}", "{field:city}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi"], label: "Delhi" },
          city: { value: "Mumbai", label: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "multifield",
              operator: "multiselect_some_in",
              value: [["delhi", "mumbai"]],
            },
          },
        },
      })
    );
  });

  it("should handle field template with no response value", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            operator: "select_equals",
            value: ["{field:location}"],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {}, // No response for location field
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              operator: "select_equals",
              value: ["{field:location}"], // Should remain unchanged
            },
          },
        },
      })
    );
  });

  it("should handle field template with unknown field", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "unknown",
            operator: "select_equals",
            value: ["{field:unknown}"],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          unknown: { value: "test", label: "test" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "unknown",
              operator: "select_equals",
              value: ["{field:unknown}"], // Should remain unchanged
            },
          },
        },
      })
    );
  });

  it("should handle complex nested structure", () => {
    const queryValue = createAttributesQueryValue({
      id: "test",
      type: "group",
      children1: {
        rule1: createQueryValueRule({
          type: "rule",
          properties: {
            field: "attr1",
            operator: "multiselect_some_in",
            value: [["{field:location}", "Fixed-Value"]],
            valueType: ["multiselect"],
          },
        }),
      },
    });

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi", "Haryana"], label: "Delhi, Haryana" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "test",
        type: "group",
        children1: {
          rule1: {
            type: "rule",
            properties: expect.objectContaining({
              field: "attr1",
              value: [["delhi", "haryana", "Fixed-Value"]],
              operator: "multiselect_some_in",
            }),
          },
        },
      })
    );
  });

  it("should handle empty array values", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            operator: "multiselect_some_in",
            value: [["{field:location}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: [], label: "" }, // Empty array
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              operator: "multiselect_some_in",
              value: [[]], // Should be empty array
            },
          },
        },
      })
    );
  });

  it("should handle no dynamicFieldValueOperands", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: ["{field:location}"],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: undefined,
      attributes: mockAttributes,
    });

    expect(result).toEqual(queryValue); // Should return unchanged
  });

  it("should preserve case for non-template values in mixed arrays", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            operator: "multiselect_some_in",
            value: [["{field:location}", "Chennai", "MUMBAI"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi"], label: "Delhi" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              operator: "multiselect_some_in",
              value: [["delhi", "Chennai", "MUMBAI"]], // Only field template value is lowercased
            },
          },
        },
      })
    );
  });

  it("should handle deeply nested field templates", () => {
    const queryValue = createNestedGroupQueryValue({
      groups: [
        {
          groupId: "group1",
          rules: [
            {
              ruleId: "rule1",
              field: "location",
              value: [["{field:location}", "Fixed1"]],
              valueType: ["multiselect"],
            },
            {
              ruleId: "rule2",
              field: "city",
              value: [["{field:city}", "Fixed2"]],
              valueType: ["multiselect"],
            },
          ],
        },
      ],
    });

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi", "Mumbai"], label: "Delhi, Mumbai" },
          city: { value: "Chennai", label: "Chennai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: "group",
        children1: {
          group1: {
            type: "group",
            children1: {
              rule1: {
                type: "rule",
                properties: expect.objectContaining({
                  field: "location",
                  value: [["delhi", "mumbai", "Fixed1"]],
                }),
              },
              rule2: {
                type: "rule",
                properties: expect.objectContaining({
                  field: "city",
                  value: [["chennai", "Fixed2"]],
                }),
              },
            },
          },
        },
      })
    );
  });

  it("should handle field template with array containing special characters", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["New York", "São Paulo", "Zürich"], label: "New York, São Paulo, Zürich" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              value: [["new york", "são paulo", "zürich"]],
            },
          },
        },
      })
    );
  });

  it("should handle null and undefined values gracefully", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "mixed",
            value: [["{field:location}", null, "{field:city}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi"], label: "Delhi" },
          city: { value: null as any, label: "" }, // null value
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "mixed",
              value: [["delhi", null, "{field:city}"]], // city remains as template due to null value
            },
          },
        },
      })
    );
  });

  it("should handle numeric values from fields", () => {
    const numericFields = [
      { id: "age", type: RoutingFormFieldType.NUMBER, label: "Age", options: [] },
      { id: "count", type: RoutingFormFieldType.NUMBER, label: "Count", options: [] },
    ];

    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "numbers",
            value: [["{field:age}", "{field:count}", 42]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: numericFields,
        response: {
          age: { value: 25, label: "25" },
          count: { value: 100, label: "100" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "numbers",
              value: [["25", "100", 42]],
            },
          },
        },
      })
    );
  });

  it("should handle very large arrays efficiently", () => {
    const largeArray = new Array(100).fill("item");
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}", ...largeArray]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi", "Mumbai"], label: "Delhi, Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result.children1?.rule1.properties?.value[0]).toHaveLength(102); // 2 from field + 100 items
    expect(result.children1?.rule1.properties?.value[0].slice(0, 2)).toEqual(["delhi", "mumbai"]);
  });

  it("should handle edge case with empty string field values", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["", " ", "Delhi"], label: ", , Delhi" }, // Empty and whitespace strings
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              value: [["", " ", "delhi"]],
            },
          },
        },
      })
    );
  });

  it("should handle field templates with hyphens and underscores in field names", () => {
    const specialFields = [
      { id: "field-with-dashes", type: RoutingFormFieldType.TEXT, label: "Dashed Field", options: [] },
      {
        id: "field_with_underscores",
        type: RoutingFormFieldType.TEXT,
        label: "Underscored Field",
        options: [],
      },
    ];

    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "special",
            value: ["{field:field-with-dashes}", "{field:field_with_underscores}"],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: specialFields,
        response: {
          "field-with-dashes": { value: "Value2", label: "Value2" },
          field_with_underscores: { value: "Value3", label: "Value3" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "special",
              value: ["value2", "value3"],
            },
          },
        },
      })
    );
  });

  it("should handle field templates in different JSON value types", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "city",
            value: "{field:city}",
          },
        },
        rule2: {
          type: "rule",
          properties: {
            field: "city",
            value: ["{field:city}"],
          },
        },
        rule3: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}"]],
          },
        },
        rule4: {
          type: "rule",
          properties: {
            field: "mixed",
            customProp: "{field:city}",
            nested: {
              value: ["{field:location}"],
            },
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: { value: ["Delhi", "Mumbai"], label: "Delhi, Mumbai" },
          city: { value: "Chennai", label: "Chennai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "city",
              value: "chennai",
            },
          },
          rule2: {
            type: "rule",
            properties: {
              field: "city",
              value: ["chennai"],
            },
          },
          rule3: {
            type: "rule",
            properties: {
              field: "location",
              value: [["delhi", "mumbai"]],
            },
          },
          rule4: {
            type: "rule",
            properties: {
              field: "mixed",
              customProp: "chennai",
              nested: {
                value: ["delhi", "mumbai"],
              },
            },
          },
        },
      })
    );
  });

  it("should handle empty response object", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}", "Fixed"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {}, // Empty response
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              value: [["{field:location}", "Fixed"]], // Template unchanged
            },
          },
        },
      })
    );
  });

  it("should handle response with empty field value object", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "location",
            value: [["{field:location}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          location: {} as any, // Empty object, no value property
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "location",
              value: [["{field:location}"]], // Template unchanged
            },
          },
        },
      })
    );
  });

  it("should handle multiple occurrences of the same field template", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "city",
            value: ["{field:city}"],
          },
        },
        rule2: {
          type: "rule",
          properties: {
            field: "city",
            value: ["{field:city}"],
          },
        },
        rule3: {
          type: "rule",
          properties: {
            field: "city",
            value: [["{field:city}", "{field:city}"]],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "city",
              value: ["mumbai"],
            },
          },
          rule2: {
            type: "rule",
            properties: {
              field: "city",
              value: ["mumbai"],
            },
          },
          rule3: {
            type: "rule",
            properties: {
              field: "city",
              value: [["mumbai", "mumbai"]],
            },
          },
        },
      })
    );
  });

  it("should handle invalid query structure gracefully", () => {
    // Test with an invalid query structure
    const invalidQueryValue = null as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue: invalidQueryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    expect(result).toBeNull();
  });

  it("should handle valid JSON that causes processing errors gracefully", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "nonexistent",
            value: ["{field:nonexistent}"],
          },
        },
        rule2: {
          type: "rule",
          properties: {
            field: "city",
            customField: "{field:city}",
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    // Non-existent field should remain as-is, existing field should be resolved
    expect(result).toEqual(
      expect.objectContaining({
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "nonexistent",
              value: ["{field:nonexistent}"],
            },
          },
          rule2: {
            type: "rule",
            properties: {
              field: "city",
              customField: "mumbai",
            },
          },
        },
      })
    );
  });

  it("should handle field templates in deeply nested object structures", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            field: "complex",
            metadata: {
              level1: {
                value: "{field:city}",
                level2: {
                  items: ["{field:location}"],
                  level3: {
                    nested: [["{field:city}"]],
                    static: "preserved",
                  },
                },
              },
            },
            value: ["test"],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
          location: { value: ["Delhi", "Chennai"], label: "Delhi, Chennai" },
        },
      },
      attributes: mockAttributes,
    });

    // Verify all nested properties are preserved with templates resolved
    const props = result.children1?.rule1.properties as any;
    expect(props.metadata.level1.level2.level3.static).toBe("preserved");
    expect(props.metadata.level1.value).toBe("mumbai");
    expect(props.metadata.level1.level2.items).toEqual(["delhi", "chennai"]);
    expect(props.metadata.level1.level2.level3.nested).toEqual([["mumbai"]]);
    expect(props.value).toEqual(["test"]);
  });

  it("should handle extremely deep object nesting without stack overflow", () => {
    let deepObj: any = { value: "{field:city}" };
    for (let i = 0; i < 100; i++) {
      deepObj = { nested: deepObj, level: i };
    }

    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: deepObj,
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
        },
      },
      attributes: mockAttributes,
    });

    // Navigate to deepest level to verify it was processed
    let current = result.children1?.rule1.properties as any;
    for (let i = 99; i >= 0; i--) {
      expect(current.level).toBe(i);
      current = current.nested;
    }
    expect(current.value).toBe("mumbai");
  });

  it("should preserve all JavaScript primitive types in nested structures", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            stringField: "{field:city}",
            numberField: 42,
            bigintField: 9007199254740991,
            booleanField: true,
            nullField: null,
            nested: {
              array: ["{field:location}", 123, false, null],
              decimal: 3.14159,
              negative: -100,
              zero: 0,
              emptyString: "",
              specialChars: "!@#$%^&*()",
            },
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
          location: { value: ["Delhi"], label: "Delhi" },
        },
      },
      attributes: mockAttributes,
    });

    const props = result.children1?.rule1.properties as any;
    expect(props.stringField).toBe("mumbai");
    expect(props.numberField).toBe(42);
    expect(props.bigintField).toBe(9007199254740991);
    expect(props.booleanField).toBe(true);
    expect(props.nullField).toBeNull();
    expect(props.nested.array).toEqual(["delhi", 123, false, null]);
    expect(props.nested.decimal).toBe(3.14159);
    expect(props.nested.negative).toBe(-100);
    expect(props.nested.zero).toBe(0);
    expect(props.nested.emptyString).toBe("");
    expect(props.nested.specialChars).toBe("!@#$%^&*()");
  });

  it("should process field templates within objects inside arrays", () => {
    const queryValue = {
      children1: {
        rule1: {
          type: "rule",
          properties: {
            value: [
              { id: 1, city: "{field:city}" },
              { id: 2, locations: ["{field:location}"] },
              { id: 3, nested: { value: [["{field:city}"]] } },
            ],
          },
        },
      },
    } as unknown as AttributesQueryValue;

    const result = resolveQueryValue({
      queryValue,
      dynamicFieldValueOperands: {
        fields: mockFields,
        response: {
          city: { value: "Mumbai", label: "Mumbai" },
          location: { value: ["Delhi", "Chennai"], label: "Delhi, Chennai" },
        },
      },
      attributes: mockAttributes,
    });

    const props = result.children1?.rule1.properties as any;
    expect(props.value[0]).toEqual({ id: 1, city: "mumbai" });
    expect(props.value[1]).toEqual({
      id: 2,
      locations: ["delhi", "chennai"],
    });
    expect(props.value[2]).toEqual({
      id: 3,
      nested: { value: [["mumbai"]] },
    });
  });
});
