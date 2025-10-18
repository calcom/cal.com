import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { lockUser, LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import { scheduleWorkflowNotifications } from "@calcom/trpc/server/routers/viewer/workflows/util";

import { scanWorkflowBody, iffyScanBody } from "./scanWorkflowBody";

vi.mock("@calcom/features/ee/api-keys/lib/autoLock", async (importActual) => {
  const actual = await importActual<typeof import("@calcom/features/ee/api-keys/lib/autoLock")>();
  return {
    ...actual, // Keep all original exports
    lockUser: vi.fn(), // Override just the lockUser function
  };
});

vi.mock("@calcom/trpc/server/routers/viewer/workflows/util", () => ({
  scheduleWorkflowNotifications: vi.fn(),
}));

vi.mock("./scanWorkflowBody", async (importActual) => {
  const actual = await importActual<typeof import("./scanWorkflowBody")>();
  return {
    ...actual,
    iffyScanBody: vi.fn(),
  };
});

const mockWorkflowStep = {
  id: 1,
  reminderBody: "Test reminder body",
  workflow: {
    user: {
      timeFormat: 24,
    },
  },
};

const mockWorkflow = {
  id: 1,
  time: 24,
  timeUnit: "hour",
  trigger: "BEFORE",
  activeOn: [{ eventTypeId: 1 }],
  team: null,
};

describe("scanWorkflowBody", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    process.env.IFFY_API_KEY = "test-key";
    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);
  });

  it("should skip scan if IFFY_API_KEY is not set", async () => {
    process.env.IFFY_API_KEY = "";
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    await scanWorkflowBody(payload);

    expect(iffyScanBody).not.toHaveBeenCalled();
  });

  it("should mark workflow step as safe if no reminder body", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([{ ...mockWorkflowStep, reminderBody: null }]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);

    await scanWorkflowBody(payload);

    expect(prismaMock.workflowStep.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { verifiedAt: expect.any(Date) },
    });
  });

  it("should mark workflow step as safe if content is not spam", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ flagged: false }),
    });

    await scanWorkflowBody(payload);

    expect(mockFetch).toHaveBeenCalledWith("https://api.iffy.com/api/v1/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer test-key`,
      },
      body: JSON.stringify({
        clientId: "Workflow step - 1",
        name: "Workflow",
        entity: "WorkflowBody",
        content: "Test reminder body",
        passthrough: true,
      }),
    });
    expect(prismaMock.workflowStep.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { verifiedAt: expect.any(Date) },
    });
  });

  it.skip("should lock user and not update step if content is spam", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ flagged: true }),
    });

    await scanWorkflowBody(payload);

    expect(mockFetch).toHaveBeenCalledWith("https://api.iffy.com/api/v1/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer test-key`,
      },
      body: JSON.stringify({
        clientId: "Workflow step - 1",
        name: "Workflow",
        entity: "WorkflowBody",
        content: "Test reminder body",
        passthrough: true,
      }),
    });
    expect(prismaMock.workflowStep.update).not.toHaveBeenCalled();
    expect(lockUser).toHaveBeenCalledWith("userId", "1", LockReason.SPAM_WORKFLOW_BODY);
  });

  it("should schedule workflow notifications after successful scan", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);

    await scanWorkflowBody(payload);

    expect(scheduleWorkflowNotifications).toHaveBeenCalledWith({
      activeOn: [1],
      isOrg: false,
      workflowSteps: [expect.objectContaining(mockWorkflowStep)],
      time: mockWorkflow.time,
      timeUnit: mockWorkflow.timeUnit,
      trigger: mockWorkflow.trigger,
      userId: 1,
      teamId: null,
    });
  });

  it("should handle invalid payload", async () => {
    const payload = "invalid-json";

    await expect(scanWorkflowBody(payload)).rejects.toThrow();
  });

  it("should handle workflow not found", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    prismaMock.workflow.findFirst.mockResolvedValue(null);

    await scanWorkflowBody(payload);

    expect(scheduleWorkflowNotifications).not.toHaveBeenCalled();
  });

  it("should handle whitelisted user being flagged as spam", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([
      { ...mockWorkflowStep, workflow: { user: { whitelistWorkflows: true } } },
    ]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ flagged: true }),
    });

    await scanWorkflowBody(payload);

    expect(mockFetch).toHaveBeenCalledWith("https://api.iffy.com/api/v1/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer test-key`,
      },
      body: JSON.stringify({
        clientId: "Workflow step - 1",
        name: "Workflow",
        entity: "WorkflowBody",
        content: "Test reminder body",
        passthrough: true,
      }),
    });
    expect(prismaMock.workflowStep.update).toHaveBeenCalled();
    expect(scheduleWorkflowNotifications).toHaveBeenCalled();

    expect(lockUser).not.toHaveBeenCalled();
  });
});
