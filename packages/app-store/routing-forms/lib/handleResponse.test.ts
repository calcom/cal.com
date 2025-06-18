import "@calcom/lib/__mocks__/logger";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import type { TargetRoutingFormForResponse } from "./formSubmissionUtils";

vi.mock("@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic", () => ({
  findTeamMembersMatchingAttributeLogic: vi.fn(),
}));

vi.mock("@calcom/lib/server/repository/formResponse", () => ({
  RoutingFormResponseRepository: {
    recordQueuedFormResponse: vi.fn(),
    recordFormResponse: vi.fn(),
  },
}));

vi.mock("./crmRouting/routerGetCrmContactOwnerEmail", () => ({
  default: vi.fn(),
}));

vi.mock("./formSubmissionUtils", () => ({
  onSubmissionOfFormResponse: vi.fn(),
}));

vi.mock("../lib/isRouter", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: unknown) => fn,
}));

// It's important to import the modules AFTER the mocks are defined.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { default: logger } = await import("@calcom/lib/logger");

const { RoutingFormResponseRepository } = await import("@calcom/lib/server/repository/formResponse");
const { onSubmissionOfFormResponse } = await import("./formSubmissionUtils");
const { default: routerGetCrmContactOwnerEmail } = await import("./crmRouting/routerGetCrmContactOwnerEmail");
const { default: isRouter } = await import("../lib/isRouter");
const { handleResponse } = await import("./handleResponse");

const mockForm: TargetRoutingFormForResponse = {
  id: "form-id",
  name: "Test Form",
  fields: [
    {
      id: "name",
      label: "Name",
      type: "text",
      required: true,
      identifier: "name",
      formId: "form-id",
      position: 0,
      placeholder: null,
      description: null,
    },
    {
      id: "email",
      label: "Email",
      type: "email",
      required: true,
      identifier: "email",
      formId: "form-id",
      position: 1,
      placeholder: null,
      description: null,
    },
    {
      id: "guests",
      label: "Guests",
      type: "text",
      required: false,
      identifier: "guests",
      formId: "form-id",
      position: 2,
      placeholder: null,
      description: null,
    },
  ],
  routes: [],
  userId: 1,
  teamId: 1,
  team: {
    id: 1,
    name: "Test Team",
    slug: "test-team",
    parentId: 2,
    logo: null,
    bio: null,
    hideBranding: false,
    brandColor: null,
    darkBrandColor: null,
    timeZone: "UTC",
    weekStart: "Sunday",
    timeFormat: null,
    allowTeamWideScheduling: true,
    metadata: {},
    isPrivate: false,
    isOrganization: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
  enabled: true,
  isDefault: false,
  fieldsOrder: ["name", "email", "guests"],
  position: 0,
  slug: "test-form",
};

const mockResponse: z.infer<typeof ZResponseInputSchema>["response"] = {
  name: { value: "John Doe" },
  email: { value: "john.doe@example.com" },
};

describe("handleResponse", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw a TRPCError for missing required fields", async () => {
    await expect(
      handleResponse({
        response: { email: { value: "test@test.com" } }, // Name is missing
        form: mockForm,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: false,
      })
    ).rejects.toThrow(/Missing required fields Name/);
  });

  it("should throw a TRPCError for invalid email", async () => {
    await expect(
      handleResponse({
        response: {
          name: { value: "John Doe" },
          email: { value: "invalid-email" },
        },
        form: mockForm,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: false,
      })
    ).rejects.toThrow(/Invalid value for fields 'Email' with value 'invalid-email' should be valid email/);
  });

  it("should record form response when not in preview and not queued", async () => {
    const dbFormResponse = {
      id: 1,
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(RoutingFormResponseRepository.recordFormResponse).mockResolvedValue(dbFormResponse);

    const result = await handleResponse({
      response: mockResponse,
      form: mockForm,
      formFillerId: "user1",
      chosenRouteId: null,
      isPreview: false,
    });

    expect(RoutingFormResponseRepository.recordFormResponse).toHaveBeenCalledWith({
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
    const queuedResponse = { id: "queued-id", formId: mockForm.id, response: mockResponse };
    vi.mocked(RoutingFormResponseRepository.recordQueuedFormResponse).mockResolvedValue(queuedResponse);

    const result = await handleResponse({
      response: mockResponse,
      form: mockForm,
      formFillerId: "user1",
      chosenRouteId: null,
      isPreview: false,
      queueFormResponse: true,
    });

    expect(RoutingFormResponseRepository.recordQueuedFormResponse).toHaveBeenCalledWith({
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
    });
    expect(RoutingFormResponseRepository.recordFormResponse).not.toHaveBeenCalled();
    expect(onSubmissionOfFormResponse).not.toHaveBeenCalled();
    expect(result.queuedFormResponse).toEqual(queuedResponse);
    expect(result.formResponse).toBeNull();
  });

  describe("Preview mode", () => {
    it("should send formResponse with id=0 and quueueFormResponse isn't true", async () => {
      const result = await handleResponse({
        response: mockResponse,
        form: mockForm,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: true,
      });

      expect(RoutingFormResponseRepository.recordFormResponse).not.toHaveBeenCalled();
      expect(onSubmissionOfFormResponse).not.toHaveBeenCalled();
      expect(result.isPreview).toBe(true);
      expect(result.formResponse).toBeDefined();
      expect(result.formResponse?.id).toBe(0);
    });

    it("should send queuedFormResponse with id=00000000-0000-0000-0000-000000000000 when queueFormResponse is true", async () => {
      const result = await handleResponse({
        response: mockResponse,
        form: mockForm,
        formFillerId: "user1",
        chosenRouteId: null,
        isPreview: true,
        queueFormResponse: true,
      });

      expect(RoutingFormResponseRepository.recordQueuedFormResponse).not.toHaveBeenCalled();
      expect(result.isPreview).toBe(true);
      expect(result.queuedFormResponse).toBeDefined();
      expect(result.queuedFormResponse?.id).toBe("00000000-0000-0000-0000-000000000000");
      expect(result.formResponse).toBeUndefined();
    });
  });

  it("should handle chosen route and call routing logic", async () => {
    const chosenRoute = {
      id: "route1",
      name: "Route 1",
      action: {
        type: "round_robin",
        value: "team-members",
      },
      position: 0,
      formId: mockForm.id,
      condition: "AND",
      criteria: [],
      attributeRoutingConfig: {
        crmSource: {
          crm: "hubspot",
          emailAttribute: "email",
        },
      },
      attributesQueryValue: {},
      fallbackAttributesQueryValue: [],
    };
    const formWithRoute = { ...mockForm, routes: [chosenRoute] };

    vi.mocked(routerGetCrmContactOwnerEmail).mockResolvedValue({
      email: "owner@example.com",
      recordType: "contact",
      crmAppSlug: "hubspot",
    });
    vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
      teamMembersMatchingAttributeLogic: [{ userId: 123, name: "Test User" }],
      timeTaken: { total: 100 },
    });

    const result = await handleResponse({
      response: mockResponse,
      form: formWithRoute,
      formFillerId: "user1",
      chosenRouteId: "route1",
      isPreview: false,
    });

    expect(routerGetCrmContactOwnerEmail).toHaveBeenCalled();
    expect(findTeamMembersMatchingAttributeLogic).toHaveBeenCalled();
    expect(result.crmContactOwnerEmail).toBe("owner@example.com");
    expect(result.teamMembersMatchingAttributeLogic).toEqual([123]);
  });

  it("should throw error if chosen route is a router", async () => {
    const chosenRoute = { id: "route1", name: "A router" };
    vi.mocked(isRouter).mockReturnValue(true);
    const formWithRoute = {
      ...mockForm,
      routes: [chosenRoute],
    };

    await expect(
      handleResponse({
        response: mockResponse,
        form: formWithRoute,
        formFillerId: "user1",
        chosenRouteId: "route1",
        isPreview: false,
      })
    ).rejects.toThrow(/Chosen route is a router/);
  });
});
