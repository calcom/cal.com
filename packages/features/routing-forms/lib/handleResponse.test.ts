import "@calcom/lib/__mocks__/logger";
import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { beforeEach, describe, expect, it, vi } from "vitest";

import routerGetCrmContactOwnerEmail from "@calcom/app-store/routing-forms/lib/crmRouting/routerGetCrmContactOwnerEmail";
import type { TargetRoutingFormForResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import isRouter from "@calcom/app-store/routing-forms/lib/isRouter";
import { RoutingFormResponseRepository } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository";

import { findTeamMembersMatchingAttributeLogic } from "./findTeamMembersMatchingAttributeLogic";
import { handleResponse } from "./handleResponse";

vi.mock("./findTeamMembersMatchingAttributeLogic", () => ({
  findTeamMembersMatchingAttributeLogic: vi.fn(),
}));

vi.mock("@calcom/features/routing-forms/repositories/RoutingFormResponseRepository");

const mockRoutingFormResponseRepository = {
  recordQueuedFormResponse: vi.fn(),
  recordFormResponse: vi.fn(),
};

vi.mock("@calcom/app-store/routing-forms/lib/crmRouting/routerGetCrmContactOwnerEmail", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/app-store/routing-forms/lib/formSubmissionUtils", () => ({
  onSubmissionOfFormResponse: vi.fn(),
}));

vi.mock("@calcom/app-store/routing-forms/lib/isRouter", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: unknown) => fn,
}));

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

const mockForm: TargetRoutingFormForResponse = {
  id: "form-id",
  name: "Test Form",
  fields: [
    {
      id: "name",
      label: "Name",
      type: "text" as const,
      required: true,
      identifier: "name",
      placeholder: undefined,
      selectText: undefined,
      deleted: false,
    },
    {
      id: "email",
      label: "Email",
      type: "email" as const,
      required: true,
      identifier: "email",
      placeholder: undefined,
      selectText: undefined,
      deleted: false,
    },
    {
      id: "guests",
      label: "Guests",
      type: "text" as const,
      required: false,
      identifier: "guests",
      placeholder: undefined,
      selectText: undefined,
      deleted: false,
    },
  ],
  routes: [],
  userId: 1,
  teamId: 1,
  user: {
    id: 1,
    email: "test@example.com",
    timeFormat: null,
    locale: null,
  },
  team: {
    parentId: 2,
  },
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
  description: null,
  disabled: false,
  settings: {
    emailOwnerOnSubmission: false,
  },
  connectedForms: [],
  routers: [],
  teamMembers: [],
  position: 0,
  updatedById: null,
};

const mockResponse: Record<
  string,
  {
    value: (string | number | string[]) & (string | number | string[] | undefined);
    label: string;
    identifier?: string | undefined;
  }
> = {
  name: { value: "John Doe", label: "Name" },
  email: { value: "john.doe@example.com", label: "Email" },
};

describe("handleResponse", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(RoutingFormResponseRepository).mockImplementation(function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mockRoutingFormResponseRepository as any;
    });
  });

  it("should throw an Error for missing required fields", async () => {
    await expect(
      handleResponse({
        response: { email: { value: "test@test.com", label: "Email" } }, // Name is missing
        form: mockForm,
        identifierKeyedResponse: null,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: false,
      })
    ).rejects.toThrow(/Missing required fields Name/);
  });

  it("should throw an Error for invalid email", async () => {
    await expect(
      handleResponse({
        response: {
          name: { value: "John Doe", label: "Name" },
          email: { value: "invalid-email", label: "Email" },
        },
        form: mockForm,
        identifierKeyedResponse: null,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: false,
      })
    ).rejects.toThrow(/Invalid value for fields 'Email' with value 'invalid-email' should be valid email/);
  });

  it("should record form response when not in preview and not queued", async () => {
    const dbFormResponse = {
      id: 1,
      uuid: "d8b4b7d2-3f45-4f67-9aa1-98c4b49cf283",
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
      formFillerId: "user1",
      routedToBookingUid: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mockRoutingFormResponseRepository.recordFormResponse).mockResolvedValue(dbFormResponse);

    const result = await handleResponse({
      response: mockResponse,
      form: mockForm,
      identifierKeyedResponse: null,
      formFillerId: "user1",
      chosenRouteId: null,
      isPreview: false,
    });

    expect(mockRoutingFormResponseRepository.recordFormResponse).toHaveBeenCalledWith({
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
    });
    expect(onSubmissionOfFormResponse).toHaveBeenCalledWith({
      form: mockForm,
      formResponseInDb: dbFormResponse,
      chosenRouteAction: null,
    });
    expect(result.formResponse).toEqual(dbFormResponse);
    expect(result.queuedFormResponse).toBeNull();
  });

  it("should queue form response when queueFormResponse is true", async () => {
    const queuedResponse = {
      id: "queued-id",
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
      actualResponseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mockRoutingFormResponseRepository.recordQueuedFormResponse).mockResolvedValue(queuedResponse);

    const result = await handleResponse({
      response: mockResponse,
      form: mockForm,
      identifierKeyedResponse: null,
      formFillerId: "user1",
      chosenRouteId: null,
      isPreview: false,
      queueFormResponse: true,
    });

    expect(mockRoutingFormResponseRepository.recordQueuedFormResponse).toHaveBeenCalledWith({
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
    });
    expect(mockRoutingFormResponseRepository.recordFormResponse).not.toHaveBeenCalled();
    expect(onSubmissionOfFormResponse).not.toHaveBeenCalled();
    expect(result.queuedFormResponse).toEqual(queuedResponse);
    expect(result.formResponse).toBeNull();
  });

  describe("Preview mode", () => {
    it("should send formResponse with id=0 and quueueFormResponse isn't true", async () => {
      const result = await handleResponse({
        response: mockResponse,
        form: mockForm,
        identifierKeyedResponse: null,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: true,
      });

      expect(mockRoutingFormResponseRepository.recordFormResponse).not.toHaveBeenCalled();
      expect(onSubmissionOfFormResponse).not.toHaveBeenCalled();
      expect(result.isPreview).toBe(true);
      expect(result.formResponse).toBeDefined();
      expect(result.formResponse?.id).toBe(0);
    });

    it("should send queuedFormResponse with id=00000000-0000-0000-0000-000000000000 when queueFormResponse is true", async () => {
      const result = await handleResponse({
        response: mockResponse,
        form: mockForm,
        identifierKeyedResponse: null,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: true,
        queueFormResponse: true,
      });

      expect(mockRoutingFormResponseRepository.recordQueuedFormResponse).not.toHaveBeenCalled();
      expect(result.isPreview).toBe(true);
      expect(result.queuedFormResponse).toBeDefined();
      expect(result.queuedFormResponse?.id).toBe("00000000-0000-0000-0000-000000000000");
      expect(result.formResponse).toBeUndefined();
    });
  });

  it("should handle chosen route and call routing logic", async () => {
    const chosenRoute = {
      id: "route1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryValue: { type: "group", children1: {} } as any,
      action: {
        type: "customPageMessage" as const,
        value: "Thank you for your submission!",
      },
      attributeRoutingConfig: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributesQueryValue: { type: "group", children1: {} } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
      isFallback: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

    vi.mocked(routerGetCrmContactOwnerEmail).mockResolvedValue({
      email: "owner@example.com",
      recordType: "contact",
      crmAppSlug: "hubspot",
      recordId: "123",
    });
    vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teamMembersMatchingAttributeLogic: [{ userId: 123, result: "MATCH" as any }],
      checkedFallback: false,
      fallbackAttributeLogicBuildingWarnings: [],
      mainAttributeLogicBuildingWarnings: [],
      timeTaken: {
        ttGetAttributesForLogic: 50,
      },
    });

    const result = await handleResponse({
      response: mockResponse,
      form: formWithRoute,
      formFillerId: "user1",
      chosenRouteId: "route1",
      isPreview: false,
      identifierKeyedResponse: {
        name: "John Doe",
        email: "john.doe@example.com",
      },
      fetchCrm: true,
    });

    expect(routerGetCrmContactOwnerEmail).toHaveBeenCalled();
    expect(findTeamMembersMatchingAttributeLogic).toHaveBeenCalled();
    expect(result.crmContactOwnerEmail).toBe("owner@example.com");
    expect(result.teamMembersMatchingAttributeLogic).toEqual([123]);
  });

  it("should throw error if chosen route is a router", async () => {
    const chosenRoute = {
      id: "route1",
      name: "A router",
      description: "Router description",
      isRouter: true as const,
      routes: [],
    };
    vi.mocked(isRouter).mockReturnValue(true);
    const formWithRoute: TargetRoutingFormForResponse = {
      ...mockForm,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      routes: [chosenRoute as any],
    };

    await expect(
      handleResponse({
        response: mockResponse,
        form: formWithRoute,
        identifierKeyedResponse: null,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: false,
      })
    ).rejects.toThrow(/Chosen route is a router/);
  });

  describe("Fallback action", () => {
    // Mock attributesQueryValue with actual rules
    const mockAttributesQueryValueWithRules = {
      type: "group",
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-1",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };

    it("should return fallbackAction when no team members match attribute logic", async () => {
      const fallbackAction = {
        type: "externalRedirectUrl" as const,
        value: "https://example.com/fallback",
      };
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: mockAttributesQueryValueWithRules as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        fallbackAction,
        isFallback: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

      vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
        teamMembersMatchingAttributeLogic: [], // Empty array = no users found
        checkedFallback: true, // Fallback was checked and triggered
        fallbackAttributeLogicBuildingWarnings: [],
        mainAttributeLogicBuildingWarnings: [],
        timeTaken: {},
      });

      const result = await handleResponse({
        response: mockResponse,
        form: formWithRoute,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      expect(result.teamMembersMatchingAttributeLogic).toEqual([]);
      expect(result.fallbackAction).toEqual(fallbackAction);

      // Verify that fallbackAttributesQueryValue is NOT passed when fallbackAction is configured
      expect(findTeamMembersMatchingAttributeLogic).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackAttributesQueryValue: undefined,
        }),
        expect.anything()
      );
    });

    it("should return null fallbackAction when team members are found", async () => {
      const fallbackAction = {
        type: "externalRedirectUrl" as const,
        value: "https://example.com/fallback",
      };
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: mockAttributesQueryValueWithRules as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        fallbackAction,
        isFallback: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

      vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teamMembersMatchingAttributeLogic: [{ userId: 123, result: "MATCH" as any }],
        checkedFallback: false,
        fallbackAttributeLogicBuildingWarnings: [],
        mainAttributeLogicBuildingWarnings: [],
        timeTaken: {},
      });

      const result = await handleResponse({
        response: mockResponse,
        form: formWithRoute,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      expect(result.teamMembersMatchingAttributeLogic).toEqual([123]);
      expect(result.fallbackAction).toBeNull();
    });

    it("should return null fallbackAction when route has no fallbackAction configured", async () => {
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: { type: "group", children1: {} } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        // No fallbackAction configured
        isFallback: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

      vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
        teamMembersMatchingAttributeLogic: [], // Empty array = no users found
        checkedFallback: false,
        fallbackAttributeLogicBuildingWarnings: [],
        mainAttributeLogicBuildingWarnings: [],
        timeTaken: {},
      });

      const result = await handleResponse({
        response: mockResponse,
        form: formWithRoute,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      expect(result.teamMembersMatchingAttributeLogic).toEqual([]);
      expect(result.fallbackAction).toBeNull();

      // Verify that fallbackAttributesQueryValue IS passed when fallbackAction is NOT configured (backwards compatibility)
      expect(findTeamMembersMatchingAttributeLogic).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackAttributesQueryValue: { type: "group", children1: {} },
        }),
        expect.anything()
      );
    });

    it("should return null fallbackAction when teamMembersMatchingAttributeLogic is null (non-team form)", async () => {
      const fallbackAction = {
        type: "externalRedirectUrl" as const,
        value: "https://example.com/fallback",
      };
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: { type: "group", children1: {} } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        fallbackAction,
        isFallback: false,
      };
      // Non-team form (no teamId or orgId)
      const nonTeamForm: TargetRoutingFormForResponse = {
        ...mockForm,
        teamId: null,
        team: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        routes: [chosenRoute as any],
      };

      const result = await handleResponse({
        response: mockResponse,
        form: nonTeamForm,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      // teamMembersMatchingAttributeLogic is null for non-team forms
      expect(result.teamMembersMatchingAttributeLogic).toBeNull();
      // fallbackAction should be null because attribute routing has no rules configured (empty children1)
      expect(result.fallbackAction).toBeNull();
    });

    it("should return fallbackAction when team has no orgId but attribute routing is configured", async () => {
      const fallbackAction = {
        type: "externalRedirectUrl" as const,
        value: "https://example.com/fallback",
      };
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // Route has attribute routing rules configured
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: mockAttributesQueryValueWithRules as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        fallbackAction,
        isFallback: false,
      };
      // Team form but team has no parentId (not part of an org)
      const teamWithoutOrgForm: TargetRoutingFormForResponse = {
        ...mockForm,
        teamId: 123,
        team: { parentId: null }, // No org
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        routes: [chosenRoute as any],
      };

      const result = await handleResponse({
        response: mockResponse,
        form: teamWithoutOrgForm,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      // teamMembersMatchingAttributeLogic is null because orgId is missing (attribute routing couldn't run)
      expect(result.teamMembersMatchingAttributeLogic).toBeNull();
      // fallbackAction SHOULD be returned because attribute routing was configured but couldn't run
      expect(result.fallbackAction).toEqual(fallbackAction);
    });

    it("should return null fallbackAction when no team members found but CRM contact owner exists", async () => {
      const fallbackAction = {
        type: "externalRedirectUrl" as const,
        value: "https://example.com/fallback",
      };
      const chosenRoute = {
        id: "route1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryValue: { type: "group", children1: {} } as any,
        action: {
          type: "eventTypeRedirectUrl" as const,
          value: "team/30min",
        },
        attributeRoutingConfig: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributesQueryValue: mockAttributesQueryValueWithRules as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
        fallbackAction,
        isFallback: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

      vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
        teamMembersMatchingAttributeLogic: [], // Empty array = no users found
        checkedFallback: false,
        fallbackAttributeLogicBuildingWarnings: [],
        mainAttributeLogicBuildingWarnings: [],
        timeTaken: {},
      });

      // Mock CRM contact owner found
      vi.mocked(routerGetCrmContactOwnerEmail).mockResolvedValue({
        email: "crm-owner@example.com",
        recordType: "contact",
        crmAppSlug: "hubspot",
        recordId: "123",
      });

      const result = await handleResponse({
        response: mockResponse,
        form: formWithRoute,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: true,
        fetchCrm: true,
        identifierKeyedResponse: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
      });

      expect(result.teamMembersMatchingAttributeLogic).toEqual([]);
      expect(result.crmContactOwnerEmail).toEqual("crm-owner@example.com");
      // fallbackAction should be null because CRM contact owner was found
      expect(result.fallbackAction).toBeNull();
    });
  });
});
