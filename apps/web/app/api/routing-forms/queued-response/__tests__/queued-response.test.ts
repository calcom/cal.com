import "../../../../../../../tests/libs/__mocks__/prisma";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";

import { queuedResponseHandler } from "../route";

vi.mock("@calcom/lib/server/repository/formResponse");

const mockRoutingFormResponseRepository = {
  getQueuedFormResponseFromId: vi.fn(),
  recordFormResponse: vi.fn(),
};
vi.mock("@calcom/app-store/routing-forms/lib/getSerializableForm");
vi.mock("@calcom/app-store/routing-forms/lib/getResponseToStore");
vi.mock("@calcom/app-store/routing-forms/lib/formSubmissionUtils");

const mockQueuedFormResponse = {
  id: "1",
  formId: "mock-form-id",
  form: {
    id: "mock-form-id",
    name: "Test Form",
    description: "Test Form Description",
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [],
    routes: [],
    userId: 1,
    user: {
      id: 1,
      email: "test@example.com",
    },
    team: null,
    teamId: null,
    position: 1,
    updatedById: null,
    settings: {},
    disabled: false,
  },
  chosenRouteId: "mock-chosen-route-id",
  createdAt: new Date(),
  updatedAt: new Date(),
  response: {},
  actualResponseId: 1,
};

describe("queuedResponseHandler", () => {
  beforeEach(() => {
    vi.mocked(RoutingFormResponseRepository).mockImplementation(
      () => mockRoutingFormResponseRepository as any
    );
  });

  it("should process a queued form response", async () => {
    vi.mocked(mockRoutingFormResponseRepository.getQueuedFormResponseFromId).mockResolvedValue(
      mockQueuedFormResponse
    );

    vi.mocked(getSerializableForm).mockResolvedValue({
      id: "mock-form-id",
      name: "Test Form",
      description: "Test Form Description",
      fields: [],
      routes: [],
      userId: 1,
      teamId: null,
      position: 1,
      updatedById: null,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
    } as unknown as Awaited<ReturnType<typeof getSerializableForm>>);

    vi.mocked(getResponseToStore).mockResolvedValue({
      id: "mock-form-id",
      name: "Test Form",
      description: "Test Form Description",
      fields: [],
      routes: [],
      user: {
        id: 1,
        email: "test@example.com",
      },
      team: null,
    } as unknown as Awaited<ReturnType<typeof getResponseToStore>>);

    vi.mocked(onSubmissionOfFormResponse).mockResolvedValue({
      id: "mock-form-id",
      name: "Test Form",
      description: "Test Form Description",
      fields: [],
      routes: [],
      user: {
        id: 1,
        email: "test@example.com",
      },
      team: null,
    } as unknown as Awaited<ReturnType<typeof onSubmissionOfFormResponse>>);

    vi.mocked(mockRoutingFormResponseRepository.recordFormResponse).mockResolvedValue({
      id: "mock-form-id",
      name: "Test Form",
      description: "Test Form Description",
      fields: [],
      routes: [],
      user: {
        id: 1,
        email: "test@example.com",
      },
      team: null,
      chosenRouteId: "mock-chosen-route-id",
    } as unknown as Awaited<ReturnType<typeof mockRoutingFormResponseRepository.recordFormResponse>>);

    const response = await queuedResponseHandler({
      queuedFormResponseId: "1",
      params: {},
    });
    expect(response).toEqual({
      formResponseId: "mock-form-id",
      message: "Processed",
    });
  });

  it("if no queued form response is found, should return early", async () => {
    vi.mocked(mockRoutingFormResponseRepository.getQueuedFormResponseFromId).mockResolvedValue(null);
    const response = await queuedResponseHandler({
      queuedFormResponseId: "1",
      params: {},
    });
    expect(response).toEqual({
      formResponseId: null,
      message: "Already processed",
    });
  });

  it("should throw if form has no fields", async () => {
    vi.mocked(mockRoutingFormResponseRepository.getQueuedFormResponseFromId).mockResolvedValue(
      mockQueuedFormResponse
    );
    vi.mocked(getSerializableForm).mockResolvedValue({
      id: "mock-form-id",
      name: "Test Form",
      description: "Test Form Description",
      fields: undefined,
      routes: [],
      user: {
        id: 1,
        email: "test@example.com",
      },
      team: null,
    } as unknown as Awaited<ReturnType<typeof getSerializableForm>>);
    await expect(
      queuedResponseHandler({
        queuedFormResponseId: "1",
        params: {},
      })
    ).rejects.toThrow("Form has no fields");
  });
});
