import { describe, expect, it } from "vitest";
import { attributeSyncRuleConditionSchema, attributeSyncRuleSchema, syncFormDataSchema } from "./zod";

describe("attributeSyncRuleConditionSchema", () => {
  describe("team conditions", () => {
    it("should validate a valid team condition with equals operator", () => {
      const condition = {
        identifier: "teamId",
        operator: "equals",
        value: [1, 2, 3],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(condition);
      }
    });

    it("should validate a valid team condition with notEquals operator", () => {
      const condition = {
        identifier: "teamId",
        operator: "notEquals",
        value: [5],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
    });

    it("should validate a valid team condition with in operator", () => {
      const condition = {
        identifier: "teamId",
        operator: "in",
        value: [1, 2],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
    });

    it("should validate a valid team condition with notIn operator", () => {
      const condition = {
        identifier: "teamId",
        operator: "notIn",
        value: [3, 4],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
    });

    it("should reject team condition with string values", () => {
      const condition = {
        identifier: "teamId",
        operator: "equals",
        value: ["team-1", "team-2"],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });

    it("should reject team condition with invalid operator", () => {
      const condition = {
        identifier: "teamId",
        operator: "contains",
        value: [1],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });
  });

  describe("attribute conditions", () => {
    it("should validate a valid attribute condition with equals operator", () => {
      const condition = {
        identifier: "attributeId",
        attributeId: "attr-123",
        operator: "equals",
        value: ["option-1", "option-2"],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(condition);
      }
    });

    it("should validate a valid attribute condition with in operator", () => {
      const condition = {
        identifier: "attributeId",
        attributeId: "attr-456",
        operator: "in",
        value: ["opt-a", "opt-b", "opt-c"],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(true);
    });

    it("should reject attribute condition without attributeId", () => {
      const condition = {
        identifier: "attributeId",
        operator: "equals",
        value: ["option-1"],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });

    it("should reject attribute condition with number values", () => {
      const condition = {
        identifier: "attributeId",
        attributeId: "attr-123",
        operator: "equals",
        value: [1, 2, 3],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });
  });

  describe("invalid conditions", () => {
    it("should reject condition with invalid identifier", () => {
      const condition = {
        identifier: "invalidId",
        operator: "equals",
        value: [1],
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });

    it("should reject condition without value", () => {
      const condition = {
        identifier: "teamId",
        operator: "equals",
      };

      const result = attributeSyncRuleConditionSchema.safeParse(condition);

      expect(result.success).toBe(false);
    });
  });
});

describe("attributeSyncRuleSchema", () => {
  it("should validate a rule with AND operator and team conditions", () => {
    const rule = {
      operator: "AND",
      conditions: [
        {
          identifier: "teamId",
          operator: "equals",
          value: [1, 2],
        },
      ],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rule);
    }
  });

  it("should validate a rule with OR operator and attribute conditions", () => {
    const rule = {
      operator: "OR",
      conditions: [
        {
          identifier: "attributeId",
          attributeId: "attr-1",
          operator: "in",
          value: ["opt-1"],
        },
        {
          identifier: "attributeId",
          attributeId: "attr-2",
          operator: "notIn",
          value: ["opt-2"],
        },
      ],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(true);
  });

  it("should validate a rule with mixed conditions", () => {
    const rule = {
      operator: "AND",
      conditions: [
        {
          identifier: "teamId",
          operator: "equals",
          value: [1],
        },
        {
          identifier: "attributeId",
          attributeId: "attr-1",
          operator: "in",
          value: ["opt-1"],
        },
      ],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(true);
  });

  it("should validate a rule with empty conditions array", () => {
    const rule = {
      operator: "AND",
      conditions: [],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(true);
  });

  it("should reject a rule with invalid operator", () => {
    const rule = {
      operator: "XOR",
      conditions: [],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(false);
  });

  it("should reject a rule without operator", () => {
    const rule = {
      conditions: [],
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(false);
  });

  it("should reject a rule without conditions", () => {
    const rule = {
      operator: "AND",
    };

    const result = attributeSyncRuleSchema.safeParse(rule);

    expect(result.success).toBe(false);
  });
});

describe("syncFormDataSchema", () => {
  const validFormData = {
    id: "sync-123",
    name: "Test Sync",
    credentialId: 1,
    enabled: true,
    organizationId: 123,
    ruleId: "rule-123",
    rule: {
      operator: "AND",
      conditions: [
        {
          identifier: "teamId",
          operator: "equals",
          value: [1],
        },
      ],
    },
    syncFieldMappings: [
      {
        id: "mapping-1",
        integrationFieldName: "field1",
        attributeId: "attr-1",
        enabled: true,
      },
    ],
  };

  it("should validate valid form data with existing mappings", () => {
    const result = syncFormDataSchema.safeParse(validFormData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("sync-123");
      expect(result.data.name).toBe("Test Sync");
    }
  });

  it("should validate form data with new mappings (without id)", () => {
    const formData = {
      ...validFormData,
      syncFieldMappings: [
        {
          integrationFieldName: "newField",
          attributeId: "attr-new",
          enabled: false,
        },
      ],
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(true);
  });

  it("should validate form data with mixed new and existing mappings", () => {
    const formData = {
      ...validFormData,
      syncFieldMappings: [
        {
          id: "existing-mapping",
          integrationFieldName: "existingField",
          attributeId: "attr-1",
          enabled: true,
        },
        {
          integrationFieldName: "newField",
          attributeId: "attr-2",
          enabled: false,
        },
      ],
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(true);
  });

  it("should validate form data with empty mappings array", () => {
    const formData = {
      ...validFormData,
      syncFieldMappings: [],
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(true);
  });

  it("should reject form data with empty name", () => {
    const formData = {
      ...validFormData,
      name: "",
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(false);
  });

  it("should reject form data without required fields", () => {
    const formData = {
      name: "Test",
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(false);
  });

  it("should reject form data with invalid rule", () => {
    const formData = {
      ...validFormData,
      rule: {
        operator: "INVALID",
        conditions: [],
      },
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(false);
  });

  it("should reject form data with invalid mapping", () => {
    const formData = {
      ...validFormData,
      syncFieldMappings: [
        {
          integrationFieldName: "field",
          // missing attributeId and enabled
        },
      ],
    };

    const result = syncFormDataSchema.safeParse(formData);

    expect(result.success).toBe(false);
  });
});
