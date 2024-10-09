import type { BaseWidget } from "react-awesome-query-builder";
import { describe, it, expect, vi, beforeEach } from "vitest";

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
    const result = await findTeamMembersMatchingAttributeLogicOfRoute({
      form: { routes: [], fields: [] },
      response: {},
      routeId: "non-existent-route",
      teamId: 1,
    });

    expect(result).toBeNull();
  });

  it("should return null if the route does not have an attributesQueryValue set", async () => {
    const result = await findTeamMembersMatchingAttributeLogicOfRoute({
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

    const result = await findTeamMembersMatchingAttributeLogicOfRoute({
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

    const result = await findTeamMembersMatchingAttributeLogicOfRoute({
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
        findTeamMembersMatchingAttributeLogicOfRoute({
          form: {
            routes: [
              buildDefaultCustomPageRoute({
                id: "test-route",
                attributesQueryValue: buildSelectTypeFieldQueryValue({
                  rules: [
                    {
                      raqbFieldId: Attribute1.id,
                      value: [Option1OfAttribute1.id],
                      operator: "select_equals",
                    },
                  ],
                }) as AttributesQueryValue,
              }),
            ],
            fields: [],
          },
          response: {},
          routeId: "test-route",
          teamId: 1,
        })
      ).rejects.toThrow("Unsupported attribute type");
    });
  });
});
