import type { BaseWidget } from "react-awesome-query-builder";
import { describe, it, expect, vi, beforeEach } from "vitest";

import logger from "@calcom/lib/logger";
import type { AttributeType } from "@calcom/prisma/enums";

import { RoutingFormFieldType } from "../../lib/FieldTypes";
import { RaqbLogicResult } from "../../lib/evaluateRaqbLogic";
// import { EmailField } from "@calcom/ui";
import * as getAttributesModule from "../../lib/getAttributes";
import type { AttributesQueryValue, FormFieldsQueryValue } from "../../types/types";
import { findTeamMembersMatchingAttributeLogicOfRoute } from "../utils";

vi.mock("../../lib/getAttributes");
vi.mock("../../components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));
vi.mock("@calcom/ui", () => ({}));

function mockAttributesScenario({
  attributes,
  teamMembersWithAttributeOptionValuePerAttribute,
}: {
  attributes: Awaited<ReturnType<typeof getAttributesModule.getAttributesForTeam>>;
  teamMembersWithAttributeOptionValuePerAttribute: Awaited<
    ReturnType<typeof getAttributesModule.getTeamMembersWithAttributeOptionValuePerAttribute>
  >;
}) {
  vi.mocked(getAttributesModule.getAttributesForTeam).mockResolvedValue(attributes);
  vi.mocked(getAttributesModule.getTeamMembersWithAttributeOptionValuePerAttribute).mockResolvedValue(
    teamMembersWithAttributeOptionValuePerAttribute
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
    value: string | number | string[];
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
    value: string | number | string[];
    operator: string;
  }[];
}) {
  return buildQueryValue({
    rules: rules.map((rule) => ({
      raqbFieldId: rule.raqbFieldId,
      value: rule.value,
      operator: rule.operator,
      valueSrc: ["value"],
      valueType: ["select"],
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
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
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
    action: { type: "customPageMessage", value: "test" },
    queryValue: { type: "group" } as unknown as FormFieldsQueryValue,
    attributesQueryValue,
  });
}

describe("findTeamMembersMatchingAttributeLogicOfRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return null if route is not found", async () => {
    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogicOfRoute({
      form: { routes: [], fields: [] },
      response: {},
      routeId: "non-existent-route",
      teamId: 1,
    });

    expect(result).toBeNull();
  });

  it("should return null if the route does not have an attributesQueryValue set", async () => {
    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogicOfRoute({
      form: {
        routes: [
          {
            id: "test-route",
            queryValue: { type: "group" } as unknown as FormFieldsQueryValue,
            action: { type: "customPageMessage", value: "test" },
          },
        ],
        fields: [],
      },
      response: {},
      routeId: "test-route",
      teamId: 1,
    });

    expect(result).toBeNull();
  });

  it("should return matching team members with a SINGLE_SELECT attribute when a static option is selected", async () => {
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

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogicOfRoute({
      form: {
        routes: [
          {
            id: "test-route",
            action: { type: "customPageMessage", value: "test" },
            queryValue: {
              type: "group",
            } as unknown as FormFieldsQueryValue,
            attributesQueryValue: attributesQueryValue,
          },
        ],
        fields: [],
      },
      response: {},
      routeId: "test-route",
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
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

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogicOfRoute({
      form: {
        routes: [
          buildDefaultCustomPageRoute({
            id: "test-route",
            attributesQueryValue: attributesQueryValue,
          }),
        ],
        fields: [
          {
            id: Field1Id,
            type: RoutingFormFieldType.SINGLE_SELECT,
            label: "Field 1",
            options: [Option1OfField1],
          },
        ],
      },
      response: {
        [Field1Id]: {
          value: Option1OfAttribute1HumanReadableValue,
          label: Option1OfAttribute1HumanReadableValue,
        },
      },
      routeId: "test-route",
      teamId: 1,
    });

    expect(result).toEqual([
      {
        userId: 1,
        result: RaqbLogicResult.MATCH,
      },
    ]);
  });

  describe("Performance testing", () => {
    describe("20 attributes, 4000 team members", async () => {
      // In tests, the performance is actually really bad than real world. So, skipping this test for now
      it.skip("should return matching team members with a SINGLE_SELECT attribute when 'all in' option is selected", async () => {
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
          await findTeamMembersMatchingAttributeLogicOfRoute(
            {
              form: {
                routes: [
                  buildDefaultCustomPageRoute({
                    id: "test-route",
                    attributesQueryValue: attributesQueryValue,
                  }),
                ],
                fields: [],
              },
              response: {},
              routeId: "test-route",
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
          ])
        );

        if (!timeTaken) {
          throw new Error("Looks like performance testing is not enabled");
        }
        const totalTimeTaken = Object.values(timeTaken).reduce((sum, time) => sum ?? 0 + (time || 0), 0);
        console.log("Total time taken", totalTimeTaken, {
          timeTaken,
        });
        expect(totalTimeTaken).toBeLessThan(1000);
        // All of them should match
        expect(result?.length).toBe(4000);
      }, 10000);
    });
  });
});
