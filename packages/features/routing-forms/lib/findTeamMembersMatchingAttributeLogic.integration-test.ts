import { RouteActionType } from "@calcom/app-store/routing-forms/zod";
import { RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";
import prisma from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { AttributeType } from "@calcom/prisma/enums";
import { RoutingFormFieldType } from "@calcom/routing-forms/lib/FieldTypes";
import type { AttributesQueryValue, FormFieldsQueryValue } from "@calcom/routing-forms/types/types";
import type { BaseWidget } from "react-awesome-query-builder";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  findTeamMembersMatchingAttributeLogic,
  TroubleshooterCase,
} from "./findTeamMembersMatchingAttributeLogic";

let testFixtures: {
  org: Team;
  team: Team;
};

const createdResources: {
  attributeToUsers: string[];
  attributes: string[];
  memberships: number[];
  users: number[];
} = {
  attributeToUsers: [],
  attributes: [],
  memberships: [],
  users: [],
};

const createTestOrganization = async () => {
  const timestamp = Date.now() + Math.random();
  const org = await prisma.team.create({
    data: {
      name: `Test Org ${timestamp}`,
      slug: `test-org-${timestamp}`,
      isOrganization: true,
    },
  });
  return org;
};

const createTestTeam = async (overrides: { parentId: number }) => {
  const timestamp = Date.now() + Math.random();
  const team = await prisma.team.create({
    data: {
      name: `Test Team ${timestamp}`,
      slug: `test-team-${timestamp}`,
      parentId: overrides.parentId,
    },
  });
  return team;
};

const createTestUser = async (overrides?: { email?: string; username?: string }) => {
  const timestamp = Date.now() + Math.random();
  const user = await prisma.user.create({
    data: {
      email: overrides?.email ?? `test-user-${timestamp}@example.com`,
      username: overrides?.username ?? `test-user-${timestamp}`,
    },
  });
  createdResources.users.push(user.id);
  return user;
};

const createTestMemberships = async (params: { userId: number; orgId: number; teamId: number }) => {
  const orgMembership = await prisma.membership.create({
    data: {
      userId: params.userId,
      teamId: params.orgId,
      role: "MEMBER",
      accepted: true,
    },
  });
  createdResources.memberships.push(orgMembership.id);

  const teamMembership = await prisma.membership.create({
    data: {
      userId: params.userId,
      teamId: params.teamId,
      role: "MEMBER",
      accepted: true,
    },
  });
  createdResources.memberships.push(teamMembership.id);

  return { orgMembership, teamMembership };
};

const createTestAttribute = async (params: {
  orgId: number;
  id: string;
  name: string;
  type: AttributeType;
  slug: string;
  options: { id: string; value: string; slug: string; isGroup?: boolean; contains?: string[] }[];
}) => {
  const attribute = await prisma.attribute.create({
    data: {
      id: params.id,
      teamId: params.orgId,
      name: params.name,
      type: params.type,
      slug: params.slug,
      enabled: true,
      options: {
        createMany: {
          data: params.options.map((opt) => ({
            id: opt.id,
            value: opt.value,
            slug: opt.slug,
            isGroup: opt.isGroup ?? false,
            contains: opt.contains ?? [],
          })),
        },
      },
    },
  });
  createdResources.attributes.push(attribute.id);
  return attribute;
};

const createTestAttributeAssignment = async (params: {
  orgMembershipId: number;
  attributeOptionId: string;
}) => {
  const assignment = await prisma.attributeToUser.create({
    data: {
      memberId: params.orgMembershipId,
      attributeOptionId: params.attributeOptionId,
    },
  });
  createdResources.attributeToUsers.push(assignment.id);
  return assignment;
};

async function createAttributesScenario(params: {
  attributes: {
    id: string;
    name: string;
    type: AttributeType;
    slug: string;
    options: { id: string; value: string; slug: string; isGroup?: boolean; contains?: string[] }[];
  }[];
  teamMembersWithAttributeOptionValuePerAttribute: {
    userId?: number;
    attributes: Record<string, string | string[]>;
  }[];
}) {
  const { attributes, teamMembersWithAttributeOptionValuePerAttribute } = params;

  const createdAttributes = await Promise.all(
    attributes.map((attr) =>
      createTestAttribute({
        orgId: testFixtures.org.id,
        ...attr,
      })
    )
  );

  const optionValueToId = new Map<string, string>();
  for (const attr of attributes) {
    for (const opt of attr.options) {
      optionValueToId.set(`${attr.id}:${opt.value}`, opt.id);
    }
  }

  const createdUsers: { userId: number; orgMembershipId: number }[] = [];

  for (const member of teamMembersWithAttributeOptionValuePerAttribute) {
    let userId: number;
    if (member.userId) {
      userId = member.userId;
      const user = await createTestUser();
      userId = user.id;
    } else {
      const user = await createTestUser();
      userId = user.id;
    }

    const { orgMembership } = await createTestMemberships({
      userId,
      orgId: testFixtures.org.id,
      teamId: testFixtures.team.id,
    });

    for (const [attrId, value] of Object.entries(member.attributes)) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        const optionId = optionValueToId.get(`${attrId}:${v}`);
        if (optionId) {
          await createTestAttributeAssignment({
            orgMembershipId: orgMembership.id,
            attributeOptionId: optionId,
          });
        }
      }
    }

    createdUsers.push({ userId, orgMembershipId: orgMembership.id });
  }

  return { createdAttributes, createdUsers };
}

async function createHugeAttributesOfTypeSingleSelect(params: {
  numAttributes: number;
  numOptionsPerAttribute: number;
  numTeamMembers: number;
  numAttributesUsedPerTeamMember: number;
}) {
  const { numAttributes, numOptionsPerAttribute, numTeamMembers, numAttributesUsedPerTeamMember } = params;

  if (numAttributesUsedPerTeamMember > numAttributes) {
    throw new Error("numAttributesUsedPerTeamMember cannot be greater than numAttributes");
  }

  const timestamp = Date.now();
  const attributes = Array.from({ length: numAttributes }, (_, i) => ({
    id: `perf-attr-${timestamp}-${i + 1}`,
    name: `Attribute ${i + 1}`,
    type: AttributeType.SINGLE_SELECT,
    slug: `perf-attribute-${timestamp}-${i + 1}`,
    options: Array.from({ length: numOptionsPerAttribute }, (_, j) => ({
      id: `perf-opt-${timestamp}-${i}-${j + 1}`,
      value: `Option ${j + 1}`,
      slug: `perf-option-${timestamp}-${i}-${j + 1}`,
    })),
  }));

  const assignedAttributeOptionIdForEachMember = 1;

  const teamMembersWithAttributeOptionValuePerAttribute = Array.from({ length: numTeamMembers }, (_, i) => ({
    attributes: Object.fromEntries(
      Array.from({ length: numAttributesUsedPerTeamMember }, (_, j) => [
        attributes[j].id,
        attributes[j].options[assignedAttributeOptionIdForEachMember].value,
      ])
    ),
  }));

  await createAttributesScenario({
    attributes,
    teamMembersWithAttributeOptionValuePerAttribute,
  });

  return {
    attributes,
    teamMembersWithAttributeOptionValuePerAttribute,
  };
}

const cleanupCreatedResources = async () => {
  if (createdResources.attributeToUsers.length > 0) {
    await prisma.attributeToUser.deleteMany({
      where: { id: { in: createdResources.attributeToUsers } },
    });
    createdResources.attributeToUsers = [];
  }
  if (createdResources.attributes.length > 0) {
    await prisma.attribute.deleteMany({
      where: { id: { in: createdResources.attributes } },
    });
    createdResources.attributes = [];
  }
  if (createdResources.memberships.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: createdResources.memberships } },
    });
    createdResources.memberships = [];
  }
  if (createdResources.users.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdResources.users } },
    });
    createdResources.users = [];
  }
};

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function buildScenarioWhereMainAttributeLogicFails() {
  const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
  const Option2OfAttribute1 = { id: "opt2", value: "Option 2", slug: "option-2" };
  const Attribute1 = {
    id: "attr1",
    name: "Attribute 1",
    type: AttributeType.SINGLE_SELECT,
    slug: "attribute-1",
    options: [Option1OfAttribute1, Option2OfAttribute1],
  };

  await createAttributesScenario({
    attributes: [Attribute1],
    teamMembersWithAttributeOptionValuePerAttribute: [
      { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
  beforeAll(async () => {
    const org = await createTestOrganization();
    const team = await createTestTeam({ parentId: org.id });
    testFixtures = { org, team };
  });

  afterAll(async () => {
    await prisma.team.deleteMany({
      where: { id: { in: [testFixtures.team.id, testFixtures.org.id] } },
    });
  });

  afterEach(async () => {
    await cleanupCreatedResources();
  });

  it("should return null if the route does not have an attributesQueryValue set", async () => {
    await createAttributesScenario({
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
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

  describe("with a SINGLE_SELECT attribute", () => {
    it("when a static option is selected, troubleshooter should be null by default", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

      expect(result).toEqual([
        {
          userId: createdUsers[0].userId,
          result: RaqbLogicResult.MATCH,
        },
      ]);

      expect(troubleshooter).toBeUndefined();
    });

    describe("with `Value of field`", () => {
      it("when 'Value of Field' option is selected and ", async () => {
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
          type: AttributeType.SINGLE_SELECT,
          slug: "attribute-1",
          options: [Option1OfAttribute1],
        };

        const { createdUsers } = await createAttributesScenario({
          attributes: [Attribute1],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual([
          {
            userId: createdUsers[0].userId,
            result: RaqbLogicResult.MATCH,
          },
        ]);
      });
    });

    it("when 'Any in'(select_any_in) option is selected", async () => {
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
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(result).toEqual([
        {
          userId: createdUsers[0].userId,
          result: RaqbLogicResult.MATCH,
        },
      ]);
    });
  });

  describe("with a MULTI_SELECT attribute", () => {
    it("when 'Any in'(multiselect_some_in) option is selected and just one option is used in attribute for the user", async () => {
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
        type: AttributeType.MULTI_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(result).toEqual([
        {
          userId: createdUsers[0].userId,
          result: RaqbLogicResult.MATCH,
        },
      ]);
    });

    it("when 'Any in'(multiselect_some_in) option is selected and more than one option is used in attribute for the user", async () => {
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
        type: AttributeType.MULTI_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          {
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(result).toEqual([
        {
          userId: createdUsers[0].userId,
          result: RaqbLogicResult.MATCH,
        },
      ]);
    });

    describe("with `Value of field`", () => {
      it("when 'Any in'(multiselect_some_in) option is selected and more than one option is used in attribute and more than one option is selected in the field", async () => {
        const Field1Id = "location-field";
        const DelhiOption = {
          id: "delhi-opt",
          label: "Delhi",
        };
        const HaryanaOption = {
          id: "haryana-opt",
          label: "Haryana",
        };
        const MumbaiOption = {
          id: "mumbai-opt",
          label: "Mumbai",
        };

        const HeadquartersAttribute = {
          id: "headquarters-attr",
          name: "Headquarters",
          type: AttributeType.MULTI_SELECT,
          slug: "headquarters",
          options: [
            { id: "delhi-hq", value: "Delhi", slug: "delhi" },
            { id: "haryana-hq", value: "Haryana", slug: "haryana" },
            { id: "mumbai-hq", value: "Mumbai", slug: "mumbai" },
            { id: "chennai-hq", value: "Chennai", slug: "chennai" },
          ],
        };

        const { createdUsers } = await createAttributesScenario({
          attributes: [HeadquartersAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [HeadquartersAttribute.id]: ["Delhi", "Haryana"] } },
            { attributes: { [HeadquartersAttribute.id]: ["Mumbai"] } },
            { attributes: { [HeadquartersAttribute.id]: ["Chennai"] } },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: HeadquartersAttribute.id,
              value: [[`{field:${Field1Id}}`]],
              operator: "multiselect_some_in",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result1 } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: {
            fields: [
              {
                id: Field1Id,
                type: RoutingFormFieldType.MULTI_SELECT,
                label: "Location",
                options: [DelhiOption, HaryanaOption, MumbaiOption],
              },
            ],
            response: {
              [Field1Id]: { label: "Location", value: [DelhiOption.id, MumbaiOption.id] },
            },
          },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result1).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result1).not.toContainEqual({ userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH });

        const { teamMembersMatchingAttributeLogic: result2 } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: {
            fields: [
              {
                id: Field1Id,
                type: RoutingFormFieldType.MULTI_SELECT,
                label: "Location",
                options: [DelhiOption, HaryanaOption, MumbaiOption, { id: "chennai-opt", label: "Chennai" }],
              },
            ],
            response: {
              [Field1Id]: { label: "Location", value: ["chennai-opt"] },
            },
          },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result2).toEqual([{ userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH }]);
      });
    });

    it("should handle field template mixed with regular values in multiselect array", async () => {
      const LocationFieldId = "location-field";
      const FixedValueId = "fixed-location-id";

      const LocationAttribute = {
        id: "location-attr",
        name: "Service Locations",
        type: AttributeType.MULTI_SELECT,
        slug: "service-locations",
        options: [
          { id: "delhi-loc", value: "Delhi", slug: "delhi" },
          { id: "mumbai-loc", value: "Mumbai", slug: "mumbai" },
          { id: FixedValueId, value: "Chennai", slug: "chennai" },
        ],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [LocationAttribute],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [LocationAttribute.id]: ["Delhi", "Chennai"] } },
          { attributes: { [LocationAttribute.id]: ["Mumbai"] } },
        ],
      });

      const attributesQueryValue = buildSelectTypeFieldQueryValue({
        rules: [
          {
            raqbFieldId: LocationAttribute.id,
            value: [[`{field:${LocationFieldId}}`, "Chennai"]],
            operator: "multiselect_some_in",
            valueType: ["multiselect"],
          },
        ],
      }) as AttributesQueryValue;

      const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
        dynamicFieldValueOperands: {
          fields: [
            {
              id: LocationFieldId,
              type: RoutingFormFieldType.MULTI_SELECT,
              label: "Preferred Location",
              options: [
                { id: "delhi-opt", label: "Delhi" },
                { id: "mumbai-opt", label: "Mumbai" },
              ],
            },
          ],
          response: {
            [LocationFieldId]: { value: ["Mumbai"], label: "Mumbai" },
          },
        },
        attributesQueryValue,
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          { userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH },
          { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
        ])
      );
    });
  });

  describe("Fallback", () => {
    it("should return null when main attribute logic fails and no fallback is defined", async () => {
      const { failingAttributesQueryValue } = await buildScenarioWhereMainAttributeLogicFails();
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(result).toEqual(null);
      expect(checkedFallback).toEqual(true);
      expect(troubleshooter).toBeUndefined();
    });

    it("should return matching members when main attribute logic fails and but fallback matches", async () => {
      const { failingAttributesQueryValue, matchingAttributesQueryValue } =
        await buildScenarioWhereMainAttributeLogicFails();
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(checkedFallback).toEqual(true);
      expect(result).toHaveLength(1);
      expect(result![0].result).toBe(RaqbLogicResult.MATCH);

      expect(troubleshooter).toBeUndefined();
    });

    it("should return 0 matching members when main attribute logic and fallback attribute logic fail", async () => {
      const { failingAttributesQueryValue } = await buildScenarioWhereMainAttributeLogicFails();
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(checkedFallback).toEqual(true);
      expect(troubleshooter).toBeUndefined();
      expect(result).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should return null for attributes with unsupported types (TEXT with select operators)", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: AttributeType.TEXT,
        slug: "attribute-1",
        options: [Option1OfAttribute1],
      };
      await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          {
            attributes: { [Attribute1.id]: Option1OfAttribute1.value },
          },
        ],
      });

      const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic({
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
        teamId: testFixtures.team.id,
        orgId: testFixtures.org.id,
      });

      expect(teamMembersMatchingAttributeLogic).toBeNull();
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
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
          isPreview: mode === "preview" ? true : false,
          fallbackAttributesQueryValue: null,
        });
        return result;
      }

      await (async function liveMode() {
        const result = await runInMode({ mode: "live" });
        expect(result.teamMembersMatchingAttributeLogic).toEqual(null);
        expect(result.mainAttributeLogicBuildingWarnings).toEqual([
          "Value NON_EXISTING_OPTION_1 is not in list of values",
        ]);
      })();

      await (async function previewMode() {
        const result = await runInMode({ mode: "preview" });
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
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
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
    describe("20 attributes, 400 team members", async () => {
      it("should return matching team members with a SINGLE_SELECT attribute when 'all in' option is selected", async () => {
        const { attributes } = await createHugeAttributesOfTypeSingleSelect({
          numAttributes: 20,
          numOptionsPerAttribute: 30,
          numTeamMembers: 400,
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
              teamId: testFixtures.team.id,
              orgId: testFixtures.org.id,
            },
            {
              concurrency: 1,
              enablePerf: true,
            }
          );

        expect(result).toHaveLength(400);
        expect(result).toEqual(
          expect.arrayContaining([expect.objectContaining({ result: RaqbLogicResult.MATCH })])
        );

        if (!timeTaken) {
          throw new Error("Looks like performance testing is not enabled");
        }
        const totalTimeTaken = Object.values(timeTaken).reduce((sum, time) => (sum ?? 0) + (time ?? 0), 0);
        console.log("Total time taken", totalTimeTaken, {
          timeTaken,
        });
        expect(totalTimeTaken).toBeLessThan(5000);
      }, 60000);
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
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1, Option3OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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
            teamId: testFixtures.team.id,
            orgId: testFixtures.org.id,
          },
          {
            enableTroubleshooter: true,
          }
        );

      expect(result).toEqual([
        {
          userId: createdUsers[0].userId,
          result: RaqbLogicResult.MATCH,
        },
      ]);
      expect(troubleshooter).not.toBeUndefined();
    });
  });

  it("should handle non-existent option IDs gracefully", async () => {
    const LocationAttribute = {
      id: "location-attr",
      name: "Location",
      type: AttributeType.SINGLE_SELECT,
      slug: "location",
      options: [{ id: "ny-opt", value: "New York", slug: "new-york" }],
    };

    await createAttributesScenario({
      attributes: [LocationAttribute],
      teamMembersWithAttributeOptionValuePerAttribute: [
        { attributes: { [LocationAttribute.id]: "New York" } },
      ],
    });

    const attributesQueryValue = buildSelectTypeFieldQueryValue({
      rules: [
        {
          raqbFieldId: LocationAttribute.id,
          value: ["non-existent-id"],
          operator: "select_equals",
        },
      ],
    }) as AttributesQueryValue;

    const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
      dynamicFieldValueOperands: {
        fields: [],
        response: {},
      },
      attributesQueryValue,
      teamId: testFixtures.team.id,
      orgId: testFixtures.org.id,
    });

    expect(result).toEqual([]);
  });

  describe("routingFormTrace integration", () => {
    it("should call attributeLogicEvaluated when routingFormTrace is provided and main logic matches", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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

      const mockRoutingFormTrace = {
        attributeLogicEvaluated: vi.fn(),
        attributeFallbackUsed: vi.fn(),
        routeMatched: vi.fn(),
        fallbackRouteUsed: vi.fn(),
      };

      await findTeamMembersMatchingAttributeLogic(
        {
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
          routeName: "Test Route",
          routeIsFallback: false,
        },
        {
          routingFormTraceService: mockRoutingFormTrace as never,
        }
      );

      expect(mockRoutingFormTrace.attributeLogicEvaluated).toHaveBeenCalledWith(
        expect.objectContaining({
          routeName: "Test Route",
          routeIsFallback: false,
          checkedFallback: false,
        })
      );
    });

    it("should call attributeLogicEvaluated with checkedFallback=true when fallback is used", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Option2OfAttribute1 = { id: "opt2", value: "Option 2", slug: "option-2" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1, Option2OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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

      const matchingFallbackQueryValue = buildSelectTypeFieldQueryValue({
        rules: [
          {
            raqbFieldId: Attribute1.id,
            value: [Option1OfAttribute1.id],
            operator: "select_equals",
          },
        ],
      }) as AttributesQueryValue;

      const mockRoutingFormTrace = {
        attributeLogicEvaluated: vi.fn(),
        attributeFallbackUsed: vi.fn(),
        routeMatched: vi.fn(),
        fallbackRouteUsed: vi.fn(),
      };

      await findTeamMembersMatchingAttributeLogic(
        {
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue: failingAttributesQueryValue,
          fallbackAttributesQueryValue: matchingFallbackQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
          routeName: "Test Route",
          routeIsFallback: false,
        },
        {
          routingFormTraceService: mockRoutingFormTrace as never,
        }
      );

      expect(mockRoutingFormTrace.attributeLogicEvaluated).toHaveBeenCalledWith(
        expect.objectContaining({
          routeName: "Test Route",
          routeIsFallback: false,
          checkedFallback: true,
        })
      );
    });

    it("should not call attributeLogicEvaluated when routingFormTrace is not provided", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Option 1", slug: "option-1" };
      const Attribute1 = {
        id: "attr1",
        name: "Attribute 1",
        type: AttributeType.SINGLE_SELECT,
        slug: "attribute-1",
        options: [Option1OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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

      const mockRoutingFormTrace = {
        attributeLogicEvaluated: vi.fn(),
        attributeFallbackUsed: vi.fn(),
        routeMatched: vi.fn(),
        fallbackRouteUsed: vi.fn(),
      };

      await findTeamMembersMatchingAttributeLogic(
        {
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        },
        {}
      );

      expect(mockRoutingFormTrace.attributeLogicEvaluated).not.toHaveBeenCalled();
    });

    it("should include attributeRoutingDetails in trace when attributes are used", async () => {
      const Option1OfAttribute1 = { id: "opt1", value: "Enterprise", slug: "enterprise" };
      const Attribute1 = {
        id: "attr1",
        name: "Company Size",
        type: AttributeType.SINGLE_SELECT,
        slug: "company-size",
        options: [Option1OfAttribute1],
      };

      const { createdUsers } = await createAttributesScenario({
        attributes: [Attribute1],
        teamMembersWithAttributeOptionValuePerAttribute: [
          { attributes: { [Attribute1.id]: Option1OfAttribute1.value } },
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

      const mockRoutingFormTrace = {
        attributeLogicEvaluated: vi.fn(),
        attributeFallbackUsed: vi.fn(),
        routeMatched: vi.fn(),
        fallbackRouteUsed: vi.fn(),
      };

      await findTeamMembersMatchingAttributeLogic(
        {
          dynamicFieldValueOperands: {
            fields: [],
            response: {},
          },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
          routeName: "Enterprise Route",
          routeIsFallback: false,
        },
        {
          routingFormTraceService: mockRoutingFormTrace as never,
        }
      );

      expect(mockRoutingFormTrace.attributeLogicEvaluated).toHaveBeenCalledWith(
        expect.objectContaining({
          attributeRoutingDetails: expect.arrayContaining([
            expect.objectContaining({
              attributeName: "Company Size",
            }),
          ]),
        })
      );
    });
  });

  describe("negation operators with users who have no attribute assignment", () => {
    const DepartmentAttribute = {
      id: "dept-attr",
      name: "Department",
      type: AttributeType.SINGLE_SELECT,
      slug: "department",
      options: [
        { id: "dept-sales", value: "Sales", slug: "sales" },
        { id: "dept-eng", value: "Engineering", slug: "engineering" },
        { id: "dept-marketing", value: "Marketing", slug: "marketing" },
      ],
    };

    const LocationsAttribute = {
      id: "locs-attr",
      name: "Locations",
      type: AttributeType.MULTI_SELECT,
      slug: "locations",
      options: [
        { id: "loc-nyc", value: "NYC", slug: "nyc" },
        { id: "loc-la", value: "LA", slug: "la" },
        { id: "loc-chicago", value: "Chicago", slug: "chicago" },
      ],
    };

    describe("select_not_equals", () => {
      it("should match users without the attribute (undefined != 'Sales' is true)", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [DepartmentAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [DepartmentAttribute.id]: "Sales" } },
            { attributes: { [DepartmentAttribute.id]: "Engineering" } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: DepartmentAttribute.id,
              value: ["dept-sales"],
              operator: "select_not_equals",
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result).not.toContainEqual({ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH });
      });

      it("should match users who have a different attribute but not the queried one (undefined != 'Sales' is true)", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [DepartmentAttribute, LocationsAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [DepartmentAttribute.id]: "Sales" } },
            { attributes: { [DepartmentAttribute.id]: "Engineering" } },
            // User has Location but NOT Department - should still match Department != 'Sales'
            { attributes: { [LocationsAttribute.id]: ["Chicago"] } },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: DepartmentAttribute.id,
              value: ["dept-sales"],
              operator: "select_not_equals",
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        // User 1 (Engineering) and User 2 (has Location but no Department) should match
        // because Engineering != Sales and undefined != Sales are both true
        expect(result).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result).not.toContainEqual({ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH });
      });
    });

    describe("select_not_any_in", () => {
      it("should match users without the attribute (undefined not in ['Sales', 'Marketing'] is true)", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [DepartmentAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [DepartmentAttribute.id]: "Sales" } },
            { attributes: { [DepartmentAttribute.id]: "Engineering" } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: DepartmentAttribute.id,
              value: [["dept-sales", "dept-marketing"]],
              operator: "select_not_any_in",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result).not.toContainEqual({ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH });
      });
    });

    describe("multiselect_not_equals (!all)", () => {
      it("should match users without the attribute (not all of undefined in values is true)", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [LocationsAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [LocationsAttribute.id]: ["NYC", "LA"] } },
            { attributes: { [LocationsAttribute.id]: ["Chicago"] } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: LocationsAttribute.id,
              value: [["loc-nyc", "loc-la"]],
              operator: "multiselect_not_equals",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result).not.toContainEqual({ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH });
      });
    });

    describe("multiselect_not_some_in (!some)", () => {
      it("should match users without the attribute (not some of undefined in values is true)", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [LocationsAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [LocationsAttribute.id]: ["NYC"] } },
            { attributes: { [LocationsAttribute.id]: ["Chicago"] } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: LocationsAttribute.id,
              value: [["loc-nyc", "loc-la"]],
              operator: "multiselect_not_some_in",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual(
          expect.arrayContaining([
            { userId: createdUsers[1].userId, result: RaqbLogicResult.MATCH },
            { userId: createdUsers[2].userId, result: RaqbLogicResult.MATCH },
          ])
        );
        expect(result).not.toContainEqual({ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH });
      });
    });

    describe("positive operators should NOT match users without the attribute", () => {
      it("select_equals should not match users without the attribute", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [DepartmentAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [DepartmentAttribute.id]: "Sales" } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: DepartmentAttribute.id,
              value: ["dept-sales"],
              operator: "select_equals",
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual([{ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH }]);
      });

      it("select_any_in should not match users without the attribute", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [DepartmentAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [DepartmentAttribute.id]: "Sales" } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: DepartmentAttribute.id,
              value: [["dept-sales", "dept-marketing"]],
              operator: "select_any_in",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual([{ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH }]);
      });

      it("multiselect_some_in should not match users without the attribute", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [LocationsAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [LocationsAttribute.id]: ["NYC"] } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: LocationsAttribute.id,
              value: [["loc-nyc", "loc-la"]],
              operator: "multiselect_some_in",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual([{ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH }]);
      });

      it("multiselect_equals (all) should not match users without the attribute", async () => {
        const { createdUsers } = await createAttributesScenario({
          attributes: [LocationsAttribute],
          teamMembersWithAttributeOptionValuePerAttribute: [
            { attributes: { [LocationsAttribute.id]: ["NYC", "LA"] } },
            { attributes: {} },
          ],
        });

        const attributesQueryValue = buildSelectTypeFieldQueryValue({
          rules: [
            {
              raqbFieldId: LocationsAttribute.id,
              value: [["loc-nyc", "loc-la"]],
              operator: "multiselect_equals",
              valueType: ["multiselect"],
            },
          ],
        }) as AttributesQueryValue;

        const { teamMembersMatchingAttributeLogic: result } = await findTeamMembersMatchingAttributeLogic({
          dynamicFieldValueOperands: { fields: [], response: {} },
          attributesQueryValue,
          teamId: testFixtures.team.id,
          orgId: testFixtures.org.id,
        });

        expect(result).toEqual([{ userId: createdUsers[0].userId, result: RaqbLogicResult.MATCH }]);
      });
    });
  });
});
