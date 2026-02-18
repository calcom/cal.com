import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { duplicateWorkflow } from "./duplicateWorkflow";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@calcom/prisma", () => ({
  prisma: prismaMock,
}));

describe("duplicateWorkflow", () => {
  const currentUserId = 1;
  const workflowId = 100;
  const teamId = 10;

  const mockWorkflow = {
    id: workflowId,
    name: "Test Workflow",
    trigger: "BEFORE_EVENT",
    time: 30,
    timeUnit: "MINUTES",
    userId: currentUserId,
    teamId: null,
    isActiveOnAll: false,
    steps: [
      {
        stepNumber: 1,
        action: "EMAIL_HOST",
        template: "REMINDER",
        reminderBody: "Reminder body",
        emailSubject: "Subject",
        sender: "Generic",
        numberVerificationPending: false,
        verifiedAt: new Date(),
        includeCalendarEvent: true,
      },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.workflow.findUnique.mockResolvedValue(mockWorkflow as any);
  });

  it("should duplicate a personal workflow to personal context", async () => {
    prismaMock.workflow.create.mockResolvedValue({ id: 200 } as any);
    prismaMock.workflowStep.createMany.mockResolvedValue({ count: 1 } as any);

    await duplicateWorkflow({
      workflowId,
      targetTeamId: null, // Personal
      currentUserId,
    });

    expect(prismaMock.workflow.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: currentUserId,
        teamId: null,
        name: "Test Workflow (copy)",
      }),
    });

    expect(prismaMock.workflowStep.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          workflowId: 200,
          action: "EMAIL_HOST",
        }),
      ]),
    });
  });

  it("should duplicate a workflow to a team context checking permissions", async () => {
    prismaMock.workflow.create.mockResolvedValue({ id: 201 } as any);
    prismaMock.membership.findUnique.mockResolvedValue({ role: "ADMIN" } as any);

    await duplicateWorkflow({
      workflowId,
      targetTeamId: teamId,
      currentUserId,
    });

    // Should verify membership
    expect(prismaMock.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_teamId: {
          userId: currentUserId,
          teamId,
        },
      },
    });

    expect(prismaMock.workflow.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        teamId,
      }),
    });
  });

  it("should throw error if duplicate to team without permission", async () => {
    prismaMock.membership.findUnique.mockResolvedValue({ role: "MEMBER" } as any); // Not ADMIN/OWNER

    await expect(
      duplicateWorkflow({
        workflowId,
        targetTeamId: teamId,
        currentUserId,
      })
    ).rejects.toThrow("You must be an admin or owner");
  });
});
