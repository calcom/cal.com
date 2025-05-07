import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { lockUser, LockReason } from "@calcom/lib/autoLock";
import { scheduleWorkflowNotifications } from "@calcom/trpc/server/routers/viewer/workflows/util";

import { scanWorkflowBody } from "./scanWorkflowBody";

const mockAkismetCheckSpam = vi.fn();

// Mock the entire module
vi.mock("akismet-api", () => {
  return {
    AkismetClient: class {
      constructor() {
        return {
          checkSpam: mockAkismetCheckSpam,
        };
      }
    },
  };
});

vi.mock("@calcom/lib/autoLock", async (importActual) => {
  const actual = await importActual<typeof import("@calcom/lib/autoLock")>();
  return {
    ...actual, // Keep all original exports
    lockUser: vi.fn(), // Override just the lockUser function
  };
});

vi.mock("@calcom/trpc/server/routers/viewer/workflows/util", () => ({
  scheduleWorkflowNotifications: vi.fn(),
}));

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
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.AKISMET_API_KEY = "test-key";
    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    prismaMock.workflow.findFirst.mockResolvedValue(mockWorkflow);
  });

  it("should skip scan if AKISMET_API_KEY is not set", async () => {
    process.env.AKISMET_API_KEY = "";
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    await scanWorkflowBody(payload);

    expect(prismaMock.workflowStep.findMany).not.toHaveBeenCalled();
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
    mockAkismetCheckSpam.mockResolvedValue(false);

    await scanWorkflowBody(payload);

    expect(mockAkismetCheckSpam).toHaveBeenCalledWith({
      user_ip: "127.0.0.1",
      content: mockWorkflowStep.reminderBody,
    });
    expect(prismaMock.workflowStep.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { verifiedAt: expect.any(Date) },
    });
  });

  it("should lock user and not update step if content is spam", async () => {
    const payload = JSON.stringify({
      userId: 1,
      workflowStepIds: [1],
    });

    prismaMock.workflowStep.findMany.mockResolvedValue([mockWorkflowStep]);
    mockAkismetCheckSpam.mockResolvedValue(true);

    await scanWorkflowBody(payload);

    expect(mockAkismetCheckSpam).toHaveBeenCalled();
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
    mockAkismetCheckSpam.mockResolvedValue(false);

    await scanWorkflowBody(payload);

    expect(scheduleWorkflowNotifications).toHaveBeenCalledWith({
      activeOn: [1],
      isOrg: false,
      workflowSteps: [mockWorkflowStep],
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
    mockAkismetCheckSpam.mockResolvedValue(false);

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
    mockAkismetCheckSpam.mockResolvedValue(true);

    await scanWorkflowBody(payload);

    expect(mockAkismetCheckSpam).toHaveBeenCalled();
    expect(prismaMock.workflowStep.update).not.toHaveBeenCalled();
    expect(lockUser).not.toHaveBeenCalled();
  });
});
