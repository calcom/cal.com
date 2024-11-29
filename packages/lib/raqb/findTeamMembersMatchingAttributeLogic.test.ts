import type { BaseWidget } from "react-awesome-query-builder";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { RouteActionType } from "@calcom/app-store/routing-forms/zod";
import { RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";
import {
  findTeamMembersMatchingAttributeLogic,
  TroubleshooterCase,
} from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
// import { EmailField } from "@calcom/ui";
import * as getAttributesModule from "@calcom/lib/service/attribute/server/getAttributes";
import type { AttributeType } from "@calcom/prisma/enums";
import { RoutingFormFieldType } from "@calcom/routing-forms/lib/FieldTypes";
import type { AttributesQueryValue, FormFieldsQueryValue } from "@calcom/routing-forms/types/types";

vi.mock("@calcom/lib/service/attribute/server/getAttributes");
vi.mock("../../components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));
vi.mock("@calcom/ui", () => ({}));

function mockAttributesScenario({
  attributes,
  teamMembersWithAttributeOptionValuePerAttribute,
}: {
  attributes: Awaited<ReturnType<typeof getAttributesModule.getAttributesForTeam>>;
  teamMembersWithAttributeOptionValuePerAttribute: {
    userId: number;
    attributes: Record<string, string | string[]>;
  }[];
}) {
  vi.mocked(getAttributesModule.getAttributesForTeam).mockResolvedValue(attributes);
  vi.mocked(getAttributesModule.getTeamMembersWithAttributeOptionValuePerAttribute).mockResolvedValue(
    teamMembersWithAttributeOptionValuePerAttribute.map((member) => {
      return {
        ...member,
        attributes: Object.fromEntries(
          Object.entries(member.attributes).map(([attributeId, value]) => {
            return [
              attributeId,
              // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
              {
                attributeOption:
                  value instanceof Array
                    ? value.map((value) => ({ value, isGroup: false, contains: [] }))
                    : { value, isGroup: false, contains: [] },
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                type: attributes.find((attribute) => attribute.id === attributeId)!.type,
              },
            ];
          })
        ),
      };
    })
  );
}

function mockHugeAttributesOfTypeSingleSelect({
  numAttributes,
  numOptionsPerAttribute,
  numTeamMembers,
  numAttributesUsedPerTeamMember,
}: {
  numAttributes: number;
  numOptionsPerAttribute: number;
  numTeamMembers: number;
  numAttributesUsedPerTeamMember: number;
}) {
  if (numAttributesUsedPerTeamMember > numAttributes) {
    throw new Error("numAttributesUsedPerTeamMember cannot be greater than numAttributes");
  }
  const attributes = Array.from({ length: numAttributes }, (_, i) => ({
    id: `attr${i + 1}`,
    name: `Attribute ${i + 1}`,
    type: "SINGLE_SELECT" as const,
    slug: `attribute-${i + 1}`,
    options: Array.from({ length: numOptionsPerAttribute }, (_, i) => ({
      id: `opt${i + 1}`,
      value: `Option ${i + 1}`,
      slug: `option-${i + 1}`,
    })),
  }));

  const assignedAttributeOptionIdForEachMember = 1;

  const teamMembersWithAttributeOptionValuePerAttribute = Array.from({ length: numTeamMembers }, (_, i) => ({
    userId: i + 1,
    attributes: Object.fromEntries(
      Array.from({ length: numAttributesUsedPerTeamMember }, (_, j) => [
        attributes[j].id,
        attributes[j].options[assignedAttributeOptionIdForEachMember].value,
      ])
    ),
  }));

  mockAttributesScenario({
    attributes,
    teamMembersWithAttributeOptionValuePerAttribute,
  });

  return {
    attributes,
    teamMembersWithAttributeOptionValuePerAttribute,
  };
}

function buildQueryValue({
  rules,
}: {
  rules: {
    raqbFieldId: string;
    value: string | number | string[] | [string[]];
    operator: string;
    valueSrc: NonNullable<BaseWidget["valueSrc"]>[];
    valueType: string[];
  }[];
}) {
  const queryValue = {
    id: "query-id-1",
    type: "group",
    children1: rules.reduce((acc, rule, index) => {
      acc[`rule-${index + 1}`] = {
        type: "rule",
        properties: {
          field: rule.raqbFieldId,
          value: rule.value,
          operator: rule.operator,
          valueSrc: rule.valueSrc,
          valueType: rule.valueType,
        },
      };
      return acc;
    }, {} as any),
  };

  return queryValue;
}

function buildSelectTypeFieldQueryValue({
  rules,
}: {
  rules: {
    raqbFieldId: string;
    value: string | number | string[] | [string[]];
    operator: string;
    valueType?: string[];
  }[];
}) {
  return buildQueryValue({
    rules: rules.map((rule) => ({
      raqbFieldId: rule.raqbFieldId,
      value: rule.value,
      operator: rule.operator,
      valueSrc: ["value"],
      valueType: rule.valueType ?? ["select"],
    })),
  }) as AttributesQueryValue;
}

function buildRoute({
  id,
  action,
  queryValue,
  attributesQueryValue,
}: {
  id: string;
  action: {
    type: RouteActionType;
    value: string;
  };
  queryValue: FormFieldsQueryValue;
  attributesQueryValue?: AttributesQueryValue;
}) {
  return {
    id,
    action,
    queryValue,
    attributesQueryValue,
  };
}

function buildDefaultCustomPageRoute({
  id,
  attributesQueryValue,
}: {
  id: string;
  attributesQueryValue?: AttributesQueryValue;
}) {
  return buildRoute({
    id,
    action: { type: RouteActionType.CustomPageMessage, value: "test" },
    queryValue: { type: "group" } as unknown as FormFieldsQueryValue,
    attributesQueryValue,
  });
}
function buildScenarioWhereMainAttributeLogicFails() {
  const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
  const Option2OfAttribute1 = { id: "opt2", value: "Option 2", slug: "option-2" };
  const Attribute1 = {
    id: "attr1",
    name: "Attribute 1",
    type: "SINGLE_SELECT" as const,
    slug: "attribute-1",
    options: [Option1OfAttribute1, Option2OfAttribute1],
  };

  mockAttributesScenario({
    attributes: [Attribute1],
    teamMembersWithAttributeOptionValuePerAttribute: [
      { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
    ],
  });

  const failingAttributesQueryValue = buildSelectTypeFieldQueryValue({
    rules: [
      {
        raqbFieldId: Attribute1.id,
        value: [Option2OfAttribute1.id],
        operator: "select_equals",
      },
    ],
  }) as AttributesQueryValue;

  const matchingAttributesQueryValue = buildSelectTypeFieldQueryValue({
    rules: [
      {
        raqbFieldId: Attribute1.id,
        value: [Option1OfAttribute1.id],
        operator: "select_equals",
      },
    ],
  }) as AttributesQueryValue;

  return { failingAttributesQueryValue, matchingAttributesQueryValue };
}

describe("findTeamMembersMatchingAttributeLogic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return null if the route does not have an attributesQueryValue set", async () => {
    mockAttributesScenario({
      attributes: [],
      teamMembersWithAttributeOptionValuePerAttribute: [],
    });

    const { teamMembersMatchingAttributeLogic, troubleshooter } = await findTeamMembersMatchingAttributeLogic(
      {
        dynamicFieldValueOperands: {
          fields: [],
          response: {},
        },
        attributesQueryValue: { type: "group" } as unknown as AttributesQueryValue,
        teamId: 1,
      },
      {
        enableTroubleshooter: true,
      }
    );

    expect(teamMembersMatchingAttributeLogic).toBeNull();
    expect(troubleshooter).toEqual(
      expect.objectContaining({
        type: TroubleshooterCase.MATCHES_ALL_MEMBERS_BECAUSE_OF_EMPTY_QUERY_VALUE,
      })
    );
  });

  it("should return matching team members with a SINGLE_SELECT attribute when a static option is selected and troubleshooter should be null by default", async () => {
    const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
    const Attribute1 = {
      id: "attr1",
      name: "Attribute 1",
      type: "SINGLE_SELECT" as const,
      slug: "attribute-1",
      options: [Option1OfAttribute1],
    };

    mockAttributesScenario({
      attributes: [Attribute1],
      teamMembersWithAttributeOptionValuePerAttribute: [
        { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: Attribute1.id,
          value: [Option1OfAttribute1.id],
          operator: "select_equals",
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result, troubleshooter } =
      await findTeamMembersMatchingAttributeLogic({
        dynamicFieldValueOperands: {
          fields: [],
          response: {},
        },
        attributesQueryValue,
        teamId: 1,
      });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);

    expect(troubleshooter).toBeUndefined();
  });

  it("should return matching team members with a SINGLE_SELECT attribute when 'Value of Field' option is selected", async () => {
    const Option1OfAttribute1HumanReadableValue = "Option 1";
    const Option1OfField1HumanReadableValue = Option1OfAttribute1HumanReadableValue;
    const Field1Id = "field-1";

    const Option1OfAttribute1 = {
      id: "attr-1-opt-1",
      value: Option1OfAttribute1HumanReadableValue,
      slug: "option-1",
    };

    const Option1OfField1 = {
      id: "field-1-opt-1",
      label: Option1OfField1HumanReadableValue,
    };

    const Attribute1 = {
      id: "attr1",
      name: "Attribute 1",
      type: "SINGLE_SELECT" as const,
      slug: "attribute-1",
      options: [Option1OfAttribute1],
    };

    mockAttributesScenario({
      attributes: [Attribute1],
      teamMembersWithAttributeOptionValuePerAttribute: [
        { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: Attribute1.id,
          value: [`{field:${Field1Id}}`],
          operator: "select_equals",
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
      dynamicFieldValueOperands: {
        fields: [
          {
            id: Field1Id,
            type: RoutingFormFieldType.SINGLE_SELECT,
            label: "Field 1",
            options: [Option1OfField1],
          },
        ],
        response: {
          [Field1Id]: {
            value: Option1OfAttribute1HumanReadableValue,
            label: Option1OfAttribute1HumanReadableValue,
          },
        },
      },
      attributesQueryValue: attributesQueryValue,
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
  });

  it("should return matching team members with a SINGLE_SELECT attribute when 'Any in'(select_any_in) option is selected", async () => {
    const Option1OfAttribute1HumanReadableValue = "Option 1";

    const Option1OfAttribute1 = {
      id: "attr-1-opt-1",
      value: Option1OfAttribute1HumanReadableValue,
      slug: "option-1",
    };

    const Option2OfAttribute1 = {
      id: "attr-1-opt-2",
      value: "Option 2",
      slug: "option-2",
    };

    const Option3OfAttribute1 = {
      id: "attr-1-opt-3",
      value: "Option 3",
      slug: "option-3",
    };

    const Attribute1 = {
      id: "attr1",
      name: "Attribute 1",
      type: "SINGLE_SELECT" as const,
      slug: "attribute-1",
      options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
    };

    mockAttributesScenario({
      attributes: [Attribute1],
      teamMembersWithAttributeOptionValuePerAttribute: [
        { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: Attribute1.id,
          value: [[Option1OfAttribute1.id, Option2OfAttribute1.id]],
          operator: "select_any_in",
          valueType: ["multiselect"],
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
      dynamicFieldValueOperands: {
        fields: [],
        response: {},
      },
      attributesQueryValue,
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
  });

  it("should return matching team members with a MULTI_SELECT attribute when 'Any in'(multiselect_some_in) option is selected and just one option is used in attribute for the user", async () => {
    const Option1OfAttribute1HumanReadableValue = "Option 1";

    const Option1OfAttribute1 = {
      id: "attr-1-opt-1",
      value: Option1OfAttribute1HumanReadableValue,
      slug: "option-1",
    };

    const Option2OfAttribute1 = {
      id: "attr-1-opt-2",
      value: "Option 2",
      slug: "option-2",
    };

    const Option3OfAttribute1 = {
      id: "attr-1-opt-3",
      value: "Option 3",
      slug: "option-3",
    };

    const Attribute1 = {
      id: "attr1",
      name: "Attribute 1",
      type: "MULTI_SELECT" as const,
      slug: "attribute-1",
      options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
    };

    mockAttributesScenario({
      attributes: [Attribute1],
      teamMembersWithAttributeOptionValuePerAttribute: [
        // user 1 has only one option selected for the attribute
        { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: Attribute1.id,
          value: [[Option1OfAttribute1.id, Option2OfAttribute1.id]],
          operator: "multiselect_some_in",
          valueType: ["multiselect"],
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
      dynamicFieldValueOperands: {
        fields: [],
        response: {},
      },
      attributesQueryValue,
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
  });

  it("should return matching team members with a MULTI_SELECT attribute when 'Any in'(multiselect_some_in) option is selected and more than one option is used in attribute for the user", async () => {
    const Option1OfAttribute1HumanReadableValue = "Option 1";

    const Option1OfAttribute1 = {
      id: "attr-1-opt-1",
      value: Option1OfAttribute1HumanReadableValue,
      slug: "option-1",
    };

    const Option2OfAttribute1 = {
      id: "attr-1-opt-2",
      value: "Option 2",
      slug: "option-2",
    };

    const Option3OfAttribute1 = {
      id: "attr-1-opt-3",
      value: "Option 3",
      slug: "option-3",
    };

    const Attribute1 = {
      id: "attr1",
      name: "Attribute 1",
      type: "MULTI_SELECT" as const,
      slug: "attribute-1",
      options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
    };

    mockAttributesScenario({
      attributes: [Attribute1],
      teamMembersWithAttributeOptionValuePerAttribute: [
        {
          userId: 1,
          // user 1 has two options selected for the attribute
          attributes: { [Attribute1.id]: [Option2OfAttribute1.value, Option1OfAttribute1.value] },
        },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: Attribute1.id,
          value: [[Option1OfAttribute1.id, Option2OfAttribute1.id]],
          operator: "multiselect_some_in",
          valueType: ["multiselect"],
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
      dynamicFieldValueOperands: {
        fields: [],
        response: {},
      },
      attributesQueryValue,
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
  });

  describe("Fallback", () => {
    it("should return null when main attribute logic fails and no fallback is defined", async () => {
      const { failingAttributesQueryValue } = buildScenarioWhereMainAttributeLogicFails();
      const {
        teamMembersMatchingAttributeLogic: result,
        checkedFallback,
        troubleshooter,
      } = await findTeamMembersMatchingAttributeLogic({
        dynamicFieldValueOperands: {
          fields: [],
          response: {},
        },
        attributesQueryValue: failingAttributesQueryValue,
        fallbackAttributesQueryValue: null,
        teamId: 1,
      });

      expect(result).toEqual(null);
      // We checked the fallback, that is why we know it is not there
      expect(checkedFallback).toEqual(true);
      expect(troubleshooter).toBeUndefined();
    });

    it("should return matching members when main attribute logic fails and but fallback matches", async () => {
      const { failingAttributesQueryValue, matchingAttributesQueryValue } =
        buildScenarioWhereMainAttributeLogicFails();
      const {
        teamMembersMatchingAttributeLogic: result,
        checkedFallback,
        troubleshooter,
      } = await findTeamMembersMatchingAttributeLogic({
        dynamicFieldValueOperands: {
          fields: [],
          response: {},
        },
        attributesQueryValue: failingAttributesQueryValue,
        fallbackAttributesQueryValue: matchingAttributesQueryValue,
        teamId: 1,
      });

      expect(checkedFallback).toEqual(true);
      expect(result).toEqual([
        {
          userId: 1,
          result: RaqbLogicResult.MATCH,
        },
      ]);

      expect(troubleshooter).toBeUndefined();
    });

    it("should return 0 matching members when main attribute logic and fallback attribute logic fail", async () => {
      const { failingAttributesQueryValue, matchingAttributesQueryValue } =
        buildScenarioWhereMainAttributeLogicFails();
      const {
        teamMembersMatchingAttributeLogic: result,
        checkedFallback,
        troubleshooter,
      } = await findTeamMembersMatchingAttributeLogic({
        dynamicFieldValueOperands: {
          fields: [],
          response: {},
        },
        attributesQueryValue: failingAttributesQueryValue,
        fallbackAttributesQueryValue: failingAttributesQueryValue,
        teamId: 1,
      });

      expect(checkedFallback).toEqual(true);
      expect(troubleshooter).toBeUndefined();
      expect(result).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should throw an error if the attribute type is not supported", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: "UNSUPPORTED_ATTRIBUTE_TYPE" as unknown as AttributeType,
        slug: "attribute-1",
        options: [Option1OfAttribute1],
      };
      mockAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          {
            userId: 1,
            attributes: { [Attribute1.id]: Option1OfAttribute1.value },
          },
        ],
      });

      await expect(
        findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue: buildSelectTypeFieldQueryValue({
            rules: [
              {
                raqbFieldId: Attribute1.id,
                value: [Option1OfAttribute1.id],
                operator: "select_equals",
              },
            ],
          }),
          teamId: 1,
        })
      ).rejects.toThrow("Unsupported attribute type");
    });

    it("should return warnings in preview and live mode", async () => {
      const Option1OfAttribute1HumanReadableValue = "Option 1";

      const Option1OfAttribute1 = {
        id: "attr-1-opt-1",
        value: Option1OfAttribute1HumanReadableValue,
        slug: "option-1",
      };

      const Option2OfAttribute1 = {
        id: "attr-1-opt-2",
        value: "Option 2",
        slug: "option-2",
      };

      const Option3OfAttribute1 = {
        id: "attr-1-opt-3",
        value: "Option 3",
        slug: "option-3",
      };

      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: "SINGLE_SELECT" as const,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      mockAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
        ],
      });

      const attributesQueryValue = buildSelectTypeFieldQueryValue({
        rules: [
          {
            raqbFieldId: Attribute1.id,
            value: [["NON_EXISTING_OPTION_1", "NON_EXISTING_OPTION_2"]],
            operator: "select_any_in",
            valueType: ["multiselect"],
          },
        ],
      }) as AttributesQueryValue;

      async function runInMode({ mode }: { mode: "preview" | "live" }) {
        const result = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue,
          teamId: 1,
          isPreview: mode === "preview" ? true : false,
          fallbackAttributesQueryValue: null,
        });
        return result;
      }

      await (async function liveMode() {
        const result = await runInMode({ mode: "live" });
        // it will fallback to the fallback attribute logic which isn't defined and thus will return null
        expect(result.teamMembersMatchingAttributeLogic).toEqual(null);
        expect(result.mainAttributeLogicBuildingWarnings).toEqual([
          "Value NON_EXISTING_OPTION_1 is not in list of values",
        ]);
      })();

      await (async function previewMode() {
        const result = await runInMode({ mode: "preview" });
        // it will fallback to the fallback attribute logic which isn't defined and thus will return null
        expect(result.teamMembersMatchingAttributeLogic).toEqual(null);
        expect(result.mainAttributeLogicBuildingWarnings).toEqual([
          "Value NON_EXISTING_OPTION_1 is not in list of values",
        ]);
      })();
    });

    it("should not throw error if children1 is empty", async () => {
      const Option1OfAttribute1HumanReadableValue = "Option 1";

      const Option1OfAttribute1 = {
        id: "attr-1-opt-1",
        value: Option1OfAttribute1HumanReadableValue,
        slug: "option-1",
      };

      const Option2OfAttribute1 = {
        id: "attr-1-opt-2",
        value: "Option 2",
        slug: "option-2",
      };

      const Option3OfAttribute1 = {
        id: "attr-1-opt-3",
        value: "Option 3",
        slug: "option-3",
      };

      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: "SINGLE_SELECT" as const,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      mockAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
        ],
      });

      const attributesQueryValue = buildQueryValue({
        rules: [],
      }) as AttributesQueryValue;

      expect(attributesQueryValue.children1).toEqual({});

      async function runInMode({ mode }: { mode: "preview" | "live" }) {
        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue,
          teamId: 1,
          isPreview: mode === "preview" ? true : false,
        });
        return result;
      }

      await (async function liveMode() {
        const result = await runInMode({ mode: "live" });
        expect(result).toEqual(null);
      })();

      await (async function previewMode() {
        const result = await runInMode({ mode: "preview" });
        expect(result).toEqual(null);
      })();
    });
  });

  describe("Performance testing", () => {
    describe("20 attributes, 4000 team members", async () => {
      // In tests, the performance is actually really bad than real world. So, skipping this test for now
      it("should return matching team members with a SINGLE_SELECT attribute when 'all in' option is selected", async () => {
        const { attributes } = mockHugeAttributesOfTypeSingleSelect({
          numAttributes: 20,
          numOptionsPerAttribute: 30,
          numTeamMembers: 4000,
          numAttributesUsedPerTeamMember: 10,
        });
        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: attributes[0].id,
              value: [attributes[0].options[1].id],
              operator: "select_equals",
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result, timeTaken } =
          await findTeamMembersMatchingAttributeLogic(
            {
              dynamicFieldValueOperands: {
                fields: [],
                response: {},
              },
              attributesQueryValue,
              teamId: 1,
            },
            {
              concurrency: 1,
              enablePerf: true,
            }
          );

        expect(result).toEqual(
          expect.arrayContaining([
            {
              userId: 1,
              result: RaqbLogicResult.MATCH,
            },
            {
              userId: 2,
              result: RaqbLogicResult.MATCH,
            },
            {
              userId: 3,
              result: RaqbLogicResult.MATCH,
            },
            {
              userId: 2000,
              result: RaqbLogicResult.MATCH,
            },
            // Last Item
            {
              userId: 4000,
              result: RaqbLogicResult.MATCH,
            },
          ])
        );

        if (!timeTaken) {
          throw new Error("Looks like performance testing is not enabled");
        }
        const totalTimeTaken = Object.values(timeTaken).reduce((sum, time) => (sum ?? 0) + (time ?? 0), 0);
        console.log("Total time taken", totalTimeTaken, {
          timeTaken,
        });
        expect(totalTimeTaken).toBeLessThan(1000);
        // All of them should match
        expect(result?.length).toBe(4000);
      }, 10000);
    });
  });

  describe("Troubleshooter", () => {
    it("troubleshooter data should be there when enableTroubleshooter is true", async () => {
      const Option1OfAttribute1HumanReadableValue = "Option 1";

      const Option1OfAttribute1 = {
        id: "attr-1-opt-1",
        value: Option1OfAttribute1HumanReadableValue,
        slug: "option-1",
      };

      const Option2OfAttribute1 = {
        id: "attr-1-opt-2",
        value: "Option 2",
        slug: "option-2",
      };

      const Option3OfAttribute1 = {
        id: "attr-1-opt-3",
        value: "Option 3",
        slug: "option-3",
      };

      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: "SINGLE_SELECT" as const,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      mockAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { userId: 1, attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
        ],
      });

      const attributesQueryValue = buildSelectTypeFieldQueryValue({
        rules: [
          {
            raqbFieldId: Attribute1.id,
            value: [[Option1OfAttribute1.id, Option2OfAttribute1.id]],
            operator: "select_any_in",
            valueType: ["multiselect"],
          },
        ],
      }) as AttributesQueryValue;

      const { teamMembersMatchingAttributeLogic: result, troubleshooter } =
        await findTeamMembersMatchingAttributeLogic(
          {
            dynamicFieldValueOperands: {
              fields: [],
              response: {},
            },
            attributesQueryValue,
            teamId: 1,
          },
          {
            enableTroubleshooter: true,
          }
        );

      expect(result).toEqual([
        {
          userId: 1,
          result: RaqbLogicResult.MATCH,
        },
      ]);
      expect(troubleshooter).not.toBeUndefined();
    });
  });
});
