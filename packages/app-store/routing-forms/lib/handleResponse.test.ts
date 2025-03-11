import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import * as trpcUtils from "../trpc/utils";
import { handleResponse } from "./handleResponse";
import { generateResponseHash } from "./utils";

vi.mock("../trpc/utils", () => ({
  onFormSubmission: vi.fn(),
  sendResponseEmail: vi.fn(),
}));

export const createMockForm = async () => {
  return prismock.app_RoutingForms_Form.create({
    data: {
      name: "Test Form",
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "phone", type: "phone", label: "Phone", required: false },
      ],
      user: {
        create: {
          email: "test@example.com",
        },
      },
      team: {
        create: {
          parentId: 1,
          name: "Test Team",
        },
      },
    },
    include: {
      team: true,
      user: true,
    },
  });
};

describe("handleResponse", async () => {
  const mockForm = await createMockForm();
  const defaultParams = {
    response: {
      name: { label: "Name", value: "Test User" },
      email: { label: "Email", value: "test@example.com" },
      phone: { label: "Phone", value: "+1234567890" },
    },
    form: mockForm,
    formFillerId: "filler1",
    chosenRouteId: "route1",
    isPreview: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
  });

  it("should return mock data in preview mode without storing to database and firing onFormSubmission", async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = await handleResponse({
      ...defaultParams,
      isPreview: true,
    });

    expect(result.isPreview).toBe(true);
    expect(result.formResponse).toEqual(
      expect.objectContaining({
        response: defaultParams.response,
        formId: mockForm.id,
        chosenRouteId: defaultParams.chosenRouteId,
      })
    );
    const createdFormResponse = await prismock.app_RoutingForms_FormResponse.findFirst();
    expect(createdFormResponse).toBeNull();
    expect(trpcUtils.onFormSubmission).not.toHaveBeenCalled();
  });

  it("should create a new form response when submitting", async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await handleResponse(defaultParams);

    const createdFormResponse = await prismock.app_RoutingForms_FormResponse.findFirst();
    expect(createdFormResponse).toEqual(
      expect.objectContaining({
        response: defaultParams.response,
        formId: mockForm.id,
        chosenRouteId: defaultParams.chosenRouteId,
      })
    );

    expect(trpcUtils.onFormSubmission).toHaveBeenCalled();
  });

  it("should update existing response when duplicate is found and not connected to booking", async () => {
    const duplicateResponse = {
      formId: mockForm.id,
      response: defaultParams.response,
      chosenRouteId: "old-route",
      routedToBookingUid: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSubmittedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      responseHash: generateResponseHash({ response: defaultParams.response, fields: mockForm.fields! }),
    };

    const formWithDeduplication = { ...mockForm, deduplicateResponses: true };
    const response = await prismock.app_RoutingForms_FormResponse.create({
      data: duplicateResponse,
    });

    const responseId = response.id;

    const result = await handleResponse({
      ...defaultParams,
      chosenRouteId: "new-chosen-route",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      form: formWithDeduplication,
    });

    expect(result).toEqual(
      expect.objectContaining({
        isDuplicate: true,
      })
    );

    const updatedResponse = await prismock.app_RoutingForms_FormResponse.findFirst({
      where: { id: responseId },
    });

    expect(trpcUtils.onFormSubmission).not.toHaveBeenCalled();

    expect(updatedResponse?.chosenRouteId).toBe("new-chosen-route");
  });

  it("should not update existing response when duplicate is found and connected to booking", async () => {
    const duplicateResponse = {
      formId: mockForm.id,
      response: defaultParams.response,
      chosenRouteId: "old-route",
      routedToBookingUid: "booking-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSubmittedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      responseHash: generateResponseHash({ response: defaultParams.response, fields: mockForm.fields! }),
    };

    const formWithDeduplication = { ...mockForm, deduplicateResponses: true };
    const response = await prismock.app_RoutingForms_FormResponse.create({
      data: duplicateResponse,
    });

    const responseId = response.id;

    const result = await handleResponse({
      ...defaultParams,
      chosenRouteId: "new-chosen-route",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      form: formWithDeduplication,
    });

    expect(result).toEqual(
      expect.objectContaining({
        isDuplicate: true,
      })
    );

    const updatedResponse = await prismock.app_RoutingForms_FormResponse.findFirst({
      where: { id: responseId },
    });
    expect(trpcUtils.onFormSubmission).not.toHaveBeenCalled();
    expect(updatedResponse?.chosenRouteId).toBe("old-route");
  });
});
