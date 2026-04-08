import { describe, expect, it } from "vitest";

import {
  ConditionIdentifierEnum,
  ConditionOperatorEnum,
  RuleOperatorEnum,
} from "../repositories/IIntegrationAttributeSyncRepository";
import {
  formatConditionValue,
  generateConditionId,
  getConditionTypeOptions,
  getDefaultAttributeCondition,
  getDefaultTeamCondition,
  getOperatorOptionsForAttributeType,
  getParentOperatorOptions,
  getTeamOperatorOptions,
  isArrayOperator,
  isAttributeCondition,
  isTeamCondition,
} from "./ruleHelpers";

const t = (key: string) => key;

describe("generateConditionId", () => {
  it("returns a string", () => {
    const id = generateConditionId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateConditionId()));
    expect(ids.size).toBe(10);
  });
});

describe("getDefaultTeamCondition", () => {
  it("returns a condition with TEAM_ID identifier", () => {
    const condition = getDefaultTeamCondition();
    expect(condition.identifier).toBe(ConditionIdentifierEnum.TEAM_ID);
    expect(condition.operator).toBe(ConditionOperatorEnum.IN);
    expect(condition.value).toEqual([]);
    expect(condition._id).toBeDefined();
  });
});

describe("getDefaultAttributeCondition", () => {
  it("returns a condition with ATTRIBUTE_ID identifier", () => {
    const condition = getDefaultAttributeCondition();
    expect(condition.identifier).toBe(ConditionIdentifierEnum.ATTRIBUTE_ID);
    expect(condition.attributeId).toBe("");
    expect(condition.operator).toBe(ConditionOperatorEnum.EQUALS);
    expect(condition.value).toEqual([]);
    expect(condition._id).toBeDefined();
  });
});

describe("isTeamCondition", () => {
  it("returns true for team condition", () => {
    expect(
      isTeamCondition({
        identifier: ConditionIdentifierEnum.TEAM_ID,
        operator: ConditionOperatorEnum.IN,
        value: [],
      })
    ).toBe(true);
  });

  it("returns false for attribute condition", () => {
    expect(
      isTeamCondition({
        identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
        attributeId: "attr-1",
        operator: ConditionOperatorEnum.EQUALS,
        value: [],
      })
    ).toBe(false);
  });
});

describe("isAttributeCondition", () => {
  it("returns true for attribute condition", () => {
    expect(
      isAttributeCondition({
        identifier: ConditionIdentifierEnum.ATTRIBUTE_ID,
        attributeId: "attr-1",
        operator: ConditionOperatorEnum.EQUALS,
        value: [],
      })
    ).toBe(true);
  });

  it("returns false for team condition", () => {
    expect(
      isAttributeCondition({
        identifier: ConditionIdentifierEnum.TEAM_ID,
        operator: ConditionOperatorEnum.IN,
        value: [],
      })
    ).toBe(false);
  });
});

describe("isArrayOperator", () => {
  it("returns true for IN operator", () => {
    expect(isArrayOperator(ConditionOperatorEnum.IN)).toBe(true);
  });

  it("returns true for NOT_IN operator", () => {
    expect(isArrayOperator(ConditionOperatorEnum.NOT_IN)).toBe(true);
  });

  it("returns false for EQUALS operator", () => {
    expect(isArrayOperator(ConditionOperatorEnum.EQUALS)).toBe(false);
  });

  it("returns false for NOT_EQUALS operator", () => {
    expect(isArrayOperator(ConditionOperatorEnum.NOT_EQUALS)).toBe(false);
  });
});

describe("formatConditionValue", () => {
  it("passes through arrays for array operators", () => {
    expect(formatConditionValue(ConditionOperatorEnum.IN, [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("passes through arrays for NOT_IN operator", () => {
    expect(formatConditionValue(ConditionOperatorEnum.NOT_IN, ["a", "b"])).toEqual(["a", "b"]);
  });

  it("truncates to single element for non-array operators", () => {
    expect(formatConditionValue(ConditionOperatorEnum.EQUALS, ["a", "b"])).toEqual(["a"]);
  });

  it("returns empty array for empty input with EQUALS", () => {
    expect(formatConditionValue(ConditionOperatorEnum.EQUALS, [])).toEqual([]);
  });
});

describe("getTeamOperatorOptions", () => {
  it("returns IN and NOT_IN options", () => {
    const options = getTeamOperatorOptions(t);
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe(ConditionOperatorEnum.IN);
    expect(options[1].value).toBe(ConditionOperatorEnum.NOT_IN);
  });
});

describe("getOperatorOptionsForAttributeType", () => {
  it("returns EQUALS and NOT_EQUALS for SINGLE_SELECT", () => {
    const options = getOperatorOptionsForAttributeType("SINGLE_SELECT", t);
    expect(options).toHaveLength(2);
    expect(options![0].value).toBe(ConditionOperatorEnum.EQUALS);
    expect(options![1].value).toBe(ConditionOperatorEnum.NOT_EQUALS);
  });

  it("returns IN and NOT_IN for MULTI_SELECT", () => {
    const options = getOperatorOptionsForAttributeType("MULTI_SELECT", t);
    expect(options).toHaveLength(2);
    expect(options![0].value).toBe(ConditionOperatorEnum.IN);
    expect(options![1].value).toBe(ConditionOperatorEnum.NOT_IN);
  });

  it("returns EQUALS and NOT_EQUALS for TEXT", () => {
    const options = getOperatorOptionsForAttributeType("TEXT", t);
    expect(options).toHaveLength(2);
    expect(options![0].value).toBe(ConditionOperatorEnum.EQUALS);
  });

  it("returns EQUALS and NOT_EQUALS for NUMBER", () => {
    const options = getOperatorOptionsForAttributeType("NUMBER", t);
    expect(options).toHaveLength(2);
    expect(options![0].value).toBe(ConditionOperatorEnum.EQUALS);
  });
});

describe("getParentOperatorOptions", () => {
  it("returns AND and OR options", () => {
    const options = getParentOperatorOptions(t);
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe(RuleOperatorEnum.AND);
    expect(options[1].value).toBe(RuleOperatorEnum.OR);
  });
});

describe("getConditionTypeOptions", () => {
  it("returns TEAM_ID and ATTRIBUTE_ID options", () => {
    const options = getConditionTypeOptions(t);
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe(ConditionIdentifierEnum.TEAM_ID);
    expect(options[1].value).toBe(ConditionIdentifierEnum.ATTRIBUTE_ID);
  });
});
