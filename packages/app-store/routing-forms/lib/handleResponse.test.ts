import "@calcom/lib/__mocks__/logger";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import isRouter from "../lib/isRouter";
import routerGetCrmContactOwnerEmail from "./crmRouting/routerGetCrmContactOwnerEmail";
import type { TargetRoutingFormForResponse } from "./formSubmissionUtils";
import { onSubmissionOfFormResponse } from "./formSubmissionUtils";
import { handleResponse } from "./handleResponse";

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

const mockResponse: z.infer<typeof ZResponseInputSchema>["response"] = {
  name: { value: "John Doe", label: "Name" },
  email: { value: "john.doe@example.com", label: "Email" },
};

describe("handleResponse", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw a TRPCError for missing required fields", async () => {
    await expect(
      handleResponse({
        response: { email: { value: "test@test.com", label: "Email" } }, // Name is missing
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
          name: { value: "John Doe", label: "Name" },
          email: { value: "invalid-email", label: "Email" },
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
      formFillerId: "user1",
      routedToBookingUid: null,
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
    const queuedResponse = {
      id: "queued-id",
      formId: mockForm.id,
      response: mockResponse,
      chosenRouteId: null,
      actualResponseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
      queryValue: { type: "group", children1: {} } as any,
      action: {
        type: "customPageMessage" as const,
        value: "Thank you for your submission!",
      },
      attributeRoutingConfig: null,
      attributesQueryValue: { type: "group", children1: {} } as any,
      fallbackAttributesQueryValue: { type: "group", children1: {} } as any,
      isFallback: false,
    };
    const formWithRoute: TargetRoutingFormForResponse = { ...mockForm, routes: [chosenRoute as any] };

    vi.mocked(routerGetCrmContactOwnerEmail).mockResolvedValue({
      email: "owner@example.com",
      recordType: "contact",
      crmAppSlug: "hubspot",
    });
    vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
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
      routes: [chosenRoute as any],
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
