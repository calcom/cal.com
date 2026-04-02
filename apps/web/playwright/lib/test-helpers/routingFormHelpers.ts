import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { uuid } from "short-uuid";
import { createAttributes } from "./organizationHelpers";
import { createRoundRobinTeamEventType } from "./teamHelpers";

/**
 * Configuration for form fields
 */
interface FieldConfig {
  id?: string;
  type: "text" | "email" | "select" | "multiselect" | "number";
  label: string;
  identifier?: string;
  required?: boolean;
  options?: { id: string; label: string }[];
  selectText?: string;
}

/**
 * Configuration for form routes
 */
interface RouteConfig {
  id?: string;
  action: {
    type: "eventTypeRedirectUrl" | "customPageMessage" | "externalRedirectUrl";
    value: string;
  };
  isFallback?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributesQueryValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackAttributesQueryValue?: any;
}

/**
 * Configuration for team events in attribute routing
 */
interface TeamEventConfig {
  title: string;
  slug: string;
  schedulingType?: "ROUND_ROBIN" | "COLLECTIVE";
  assignAllTeamMembers?: boolean;
  length?: number;
  description?: string;
}

/**
 * Configuration for creating test routing forms
 */
interface CreateRoutingFormConfig {
  userId: number;
  teamId: number;
  /**
   * Whether to setup with attribute routing or not
   */
  formType: "default" | "attributeRouting";

  // Basic form settings
  form?: {
    name?: string;
    description?: string;
    fields?: FieldConfig[];
    routes?: RouteConfig[];
  };

  // For attribute routing (required when formType is "attributeRouting")
  attributeRouting?: {
    orgId?: number; // If not provided, will find from userId
    attributes: {
      name: string;
      type: "SINGLE_SELECT" | "MULTI_SELECT" | "TEXT" | "NUMBER";
      options?: string[];
    }[];
    assignments: {
      memberIndex: number;
      attributeValues: Record<string, string[]>;
    }[];
    teamEvents: TeamEventConfig[];
  };
}

/**
 * Creates a test routing form with configurable options
 *
 * The routes are not configurable at the moment
 * The hardcoded routes are:
 * - Route-1: Skills:Javascript routes to team/team-javascript selecting only those team members who have JavaScript in their skills
 * - Route-2: Skills:Sales routes to team/team-sales selecting only those team members who have Sales in their skills
 * - Route-3: Fallback Message
 *
 * The hardcoded attributes are:
 * - Location
 * - Skills
 * @param config - Configuration object containing all routing form settings
 * @returns The created routing form
 */
export async function createRoutingForm(config: CreateRoutingFormConfig) {
  const { userId, teamId, formType } = config;

  if (formType === "attributeRouting") {
    // Validate required config
    if (!config.attributeRouting) {
      throw new Error("attributeRouting config is required when formType is 'attributeRouting'");
    }

    // Find org membership
    const orgMembership = await prisma.membership.findFirstOrThrow({
      where: {
        userId,
        team: {
          isOrganization: true,
        },
      },
    });
    if (!orgMembership) {
      throw new Error("Organization membership not found");
    }

    const orgId = config.attributeRouting.orgId || orgMembership.teamId;
    const team = await prisma.team.findUniqueOrThrow({
      where: {
        id: teamId,
      },
    });

    // Use provided team events configuration
    const teamEventsConfig = config.attributeRouting.teamEvents;

    // Create team events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamEvents: { [key: string]: any } = {};
    for (const eventConfig of teamEventsConfig) {
      const eventType = await createRoundRobinTeamEventType({
        teamId,
        eventType: { ...eventConfig, length: eventConfig.length || 60 },
      });
      teamEvents[eventConfig.slug] = eventType;
    }

    // Use provided attributes and assignments configuration
    const attributes = await createAttributes({
      orgId,
      attributes: config.attributeRouting.attributes,
      assignments: config.attributeRouting.assignments,
    });

    if (!attributes) {
      throw new Error("Attributes not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const skillAttribute = attributes.find((attr) => attr.name === "Skills")!;

    const javascriptEventRoute = {
      id: "8a898988-89ab-4cde-b012-31823f708642",
      value: `team/${team.slug}/team-javascript`,
    };

    const salesEventRoute = {
      id: "8b2224b2-89ab-4cde-b012-31823f708642",
      value: `team/${team.slug}/team-sales`,
    };

    const form = {
      name: config.form?.name || "Form with Attribute Routing",
      routes: [javascriptEventRoute, salesEventRoute],
      formFieldLocation: {
        id: "674c169a-e40a-492c-b4bb-6f5213873bd6",
      },
      formFieldSkills: {
        id: "83316968-45bf-4c9d-b5d4-5368a8d2d2a8",
      },
      formFieldEmail: {
        id: "dd28ffcf-7029-401e-bddb-ce2e7496a1c1",
      },
      formFieldName: {
        id: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
      },
      formFieldRating: {
        id: "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729",
      },
    };

    const attributeRaw = {
      location: {
        id: "location-id",
        options: [
          { id: "Location-London-uuid", value: "London" },
          { id: "Location-New-York-uuid", value: "New York" },
        ],
      },
      skills: {
        id: "skills-id",
        options: [
          { id: "Skills-JavaScript-uuid", value: "JavaScript" },
          { id: "Skills-Sales-uuid", value: "Sales" },
        ],
      },
    };

    const formFieldSkillsOptions = attributeRaw.skills.options.map((opt) => ({
      id: opt.id,
      label: opt.value,
    }));

    const formFieldLocationOptions = attributeRaw.location.options.map((opt) => ({
      id: opt.id,
      label: opt.value,
    }));

    const createdForm = await prisma.app_RoutingForms_Form.create({
      data: {
        id: uuid(),
        routes: [
          {
            id: javascriptEventRoute.id,
            action: {
              type: "eventTypeRedirectUrl",
              value: javascriptEventRoute.value,
            },
            queryValue: {
              id: "aaba9988-cdef-4012-b456-719300f53ef8",
              type: "group",
              children1: {
                "b98b98a8-0123-4456-b89a-b19300f55277": {
                  type: "rule",
                  properties: {
                    field: form.formFieldSkills.id,
                    value: [
                      formFieldSkillsOptions.filter((opt) => opt.label === "JavaScript").map((opt) => opt.id),
                    ],
                    operator: "multiselect_equals",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributesQueryValue: {
              id: "ab99bbb9-89ab-4cde-b012-319300f53ef8",
              type: "group",
              children1: {
                "b98b98a8-0123-4456-b89a-b19300f55277": {
                  type: "rule",
                  properties: {
                    field: skillAttribute.id,
                    value: [
                      skillAttribute.options.filter((opt) => opt.value === "JavaScript").map((opt) => opt.id),
                    ],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
          },
          {
            id: salesEventRoute.id,
            action: {
              type: "eventTypeRedirectUrl",
              value: salesEventRoute.value,
            },
            queryValue: {
              id: "aaba9948-cdef-4012-b456-719300f53ef8",
              type: "group",
              children1: {
                "c98b98a8-1123-4456-e89a-a19300f55277": {
                  type: "rule",
                  properties: {
                    field: form.formFieldSkills.id,
                    value: [
                      formFieldSkillsOptions.filter((opt) => opt.label === "Sales").map((opt) => opt.id),
                    ],
                    operator: "multiselect_equals",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            attributesQueryValue: {
              id: "ab988888-89ab-4cde-b012-319300f53ef8",
              type: "group",
              children1: {
                "b98b98a12-0123-4456-b89a-b19300f55277": {
                  type: "rule",
                  properties: {
                    field: skillAttribute.id,
                    value: [
                      skillAttribute.options.filter((opt) => opt.value === "Sales").map((opt) => opt.id),
                    ],
                    operator: "multiselect_some_in",
                    valueSrc: ["value"],
                    valueType: ["multiselect"],
                    valueError: [null],
                  },
                },
              },
            },
            fallbackAttributesQueryValue: {
              id: "a9888488-4567-489a-bcde-f19300f53ef8",
              type: "group",
            },
          },
          {
            id: "148899aa-4567-489a-bcde-f1823f708646",
            action: { type: "customPageMessage", value: "Fallback Message" },
            isFallback: true,
            queryValue: { id: "814899aa-4567-489a-bcde-f1823f708646", type: "group" },
          },
        ],
        fields: (
          config.form?.fields ||
          ([
            {
              id: form.formFieldLocation.id,
              type: "select",
              label: "Location",
              options: formFieldLocationOptions,
              required: true,
            },
            {
              id: form.formFieldSkills.id,
              type: "multiselect",
              label: "skills",
              options: formFieldSkillsOptions,
              required: true,
            },
            {
              id: form.formFieldEmail.id,
              type: "email",
              label: "Email",
              required: true,
            },
            {
              id: form.formFieldName.id,
              identifier: "name",
              type: "text",
              label: "Name",
              required: false,
            },
            {
              id: form.formFieldRating.id,
              type: "number",
              label: "Rating",
              required: false,
            },
          ] satisfies FieldConfig[])
        ).map((field) => ({ ...field })),
        team: {
          connect: {
            id: teamId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        name: form.name,
      },
    });
    console.log(`🎯 Created form ${createdForm.id}`, JSON.stringify(createdForm, null, 2));
    return createdForm;
  } else {
    // Default routing form
    const multiSelectOption2Uuid = "d1302635-9f12-17b1-9153-c3a854649182";
    const multiSelectOption1Uuid = "d1292635-9f12-17b1-9153-c3a854649182";
    const selectOption1Uuid = "d0292635-9f12-17b1-9153-c3a854649182";
    const selectOption2Uuid = "d0302635-9f12-17b1-9153-c3a854649182";
    const multiSelectLegacyFieldUuid = "d4292635-9f12-17b1-9153-c3a854649182";
    const multiSelectFieldUuid = "d9892635-9f12-17b1-9153-c3a854649182";
    const selectFieldUuid = "d1302635-9f12-17b1-9153-c3a854649182";
    const legacySelectFieldUuid = "f0292635-9f12-17b1-9153-c3a854649182";

    const form = await prisma.app_RoutingForms_Form.create({
      data: {
        routes: (
          config.form?.routes ||
          ([
            {
              id: "8a898988-89ab-4cde-b012-31823f708642",
              action: { type: "eventTypeRedirectUrl", value: "pro/30min" },
              queryValue: {
                id: "8a898988-89ab-4cde-b012-31823f708642",
                type: "group",
                children1: {
                  "8988bbb8-0123-4456-b89a-b1823f70c5ff": {
                    type: "rule",
                    properties: {
                      field: "c4296635-9f12-47b1-8153-c3a854649182",
                      value: ["event-routing"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
              action: { type: "customPageMessage", value: "Custom Page Result" },
              queryValue: {
                id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
                type: "group",
                children1: {
                  "b99b8a89-89ab-4cde-b012-31823f718ff5": {
                    type: "rule",
                    properties: {
                      field: "c4296635-9f12-47b1-8153-c3a854649182",
                      value: ["custom-page"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
              action: { type: "externalRedirectUrl", value: `${WEBAPP_URL}/pro` },
              queryValue: {
                id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
                type: "group",
                children1: {
                  "998b9b9a-0123-4456-b89a-b1823f7232b9": {
                    type: "rule",
                    properties: {
                      field: "c4296635-9f12-47b1-8153-c3a854649182",
                      value: ["external-redirect"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
              action: { type: "customPageMessage", value: "Multiselect(Legacy) chosen" },
              queryValue: {
                id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
                type: "group",
                children1: {
                  "b98a8abb-cdef-4012-b456-718262343d27": {
                    type: "rule",
                    properties: {
                      field: multiSelectLegacyFieldUuid,
                      value: [["Option-2"]],
                      operator: "multiselect_equals",
                      valueSrc: ["value"],
                      valueType: ["multiselect"],
                    },
                  },
                },
              },
            },
            {
              id: "bb9ea8b9-0123-4456-b89a-b182623406d8",
              action: { type: "customPageMessage", value: "Multiselect chosen" },
              queryValue: {
                id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
                type: "group",
                children1: {
                  "b98a8abb-cdef-4012-b456-718262343d27": {
                    type: "rule",
                    properties: {
                      field: multiSelectFieldUuid,
                      value: [[multiSelectOption2Uuid]],
                      operator: "multiselect_equals",
                      valueSrc: ["value"],
                      valueType: ["multiselect"],
                    },
                  },
                },
              },
            },
            {
              id: "898899aa-4567-489a-bcde-f1823f708646",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "898899aa-4567-489a-bcde-f1823f708646", type: "group" },
            },
          ] satisfies RouteConfig[])
        ).map((field) => ({ ...field })),
        fields: (
          config.form?.fields ||
          ([
            {
              id: "c4296635-9f12-47b1-8153-c3a854649182",
              type: "text",
              label: "Test field",
              required: true,
            },
            {
              id: multiSelectLegacyFieldUuid,
              type: "multiselect",
              label: "Multi Select(with Legacy `selectText`)",
              identifier: "multi",
              selectText: "Option-1\nOption-2",
              required: false,
            },
            {
              id: multiSelectFieldUuid,
              type: "multiselect",
              label: "Multi Select",
              identifier: "multi-new-format",
              options: [
                {
                  id: multiSelectOption1Uuid,
                  label: "Option-1",
                },
                {
                  id: multiSelectOption2Uuid,
                  label: "Option-2",
                },
              ],
              required: false,
            },
            {
              id: legacySelectFieldUuid,
              type: "select",
              label: "Legacy Select",
              identifier: "test-select",
              selectText: "Option-1\nOption-2",
              required: false,
            },
            {
              id: selectFieldUuid,
              type: "select",
              label: "Select",
              identifier: "test-select-new-format",
              options: [
                {
                  id: selectOption1Uuid,
                  label: "Option-1",
                },
                {
                  id: selectOption2Uuid,
                  label: "Option-2",
                },
              ],
              required: false,
            },
          ] satisfies FieldConfig[])
        ).map((field) => ({ ...field })),
        user: {
          connect: {
            id: userId,
          },
        },
        name: config.form?.name || "Fixture Routing Form",
      },
    });

    return form;
  }
}
