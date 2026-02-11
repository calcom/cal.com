import process from "node:process";

import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents, TimeUnit } from "@calcom/prisma/enums";

import { scanWorkflowBody, iffyScanBody } from "../scanWorkflowBody";

// Mock the submitWorkflowStepForUrlScanning function
vi.mock("../scanWorkflowUrls", () => ({
  submitWorkflowStepForUrlScanning: vi.fn().mockResolvedValue(undefined),
}));

// Mock the scheduleWorkflowNotifications function
vi.mock("@calcom/features/ee/workflows/lib/scheduleWorkflowNotifications", () => ({
  scheduleWorkflowNotifications: vi.fn().mockResolvedValue(undefined),
}));

// Mock the Task repository
vi.mock("@calcom/features/tasker/repository", () => ({
  Task: {
    hasNewerScanTaskForStepId: vi.fn().mockResolvedValue(false),
  },
}));

// Mock the actionHelperFunctions
vi.mock("@calcom/features/ee/workflows/lib/actionHelperFunctions", () => ({
  getTemplateBodyForAction: vi.fn().mockReturnValue("Default template body"),
}));

// Mock the compareReminderBodyToTemplate
vi.mock("@calcom/features/ee/workflows/lib/compareReminderBodyToTemplate", () => ({
  default: vi.fn().mockReturnValue(false),
}));

// Mock the i18n
vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock the timeFormat
vi.mock("@calcom/lib/timeFormat", () => ({
  getTimeFormatStringFromUserTimeFormat: vi.fn().mockReturnValue("h:mma"),
}));

// Mock the constants
vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    URL_SCANNING_ENABLED: true,
  };
});

// Import mocked modules for assertions
import { submitWorkflowStepForUrlScanning } from "../scanWorkflowUrls";
import { scheduleWorkflowNotifications } from "@calcom/features/ee/workflows/lib/scheduleWorkflowNotifications";
import { Task } from "@calcom/features/tasker/repository";
import compareReminderBodyToTemplate from "@calcom/features/ee/workflows/lib/compareReminderBodyToTemplate";

describe("scanWorkflowBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.IFFY_API_KEY;
  });

  describe("happy paths", () => {
    test("should process workflow step and submit for URL scanning when IFFY is not configured", async () => {
      // Create test data in prismock
      const user = await prismock.user.create({
        data: {
          id: 1,
          email: "test@example.com",
          locale: "en",
          timeFormat: 12,
          whitelistWorkflows: false,
        },
      });

      const workflow = await prismock.workflow.create({
        data: {
          id: 1,
          name: "Test Workflow",
          userId: user.id,
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
      });

      await prismock.workflowStep.create({
        data: {
          id: 200,
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          reminderBody: '<p>Hello <a href="https://example.com">click here</a></p>',
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          id: 1,
          title: "Test Event",
          slug: "test-event",
          length: 30,
          userId: user.id,
        },
      });

      await prismock.workflowsOnEventTypes.create({
        data: {
          workflowId: workflow.id,
          eventTypeId: eventType.id,
        },
      });

      const payload = JSON.stringify({
        userId: 1,
        workflowStepId: 200,
      });

      await scanWorkflowBody(payload);

      // Should submit for URL scanning
      expect(submitWorkflowStepForUrlScanning).toHaveBeenCalledWith(
        200,
        '<p>Hello <a href="https://example.com">click here</a></p>',
        1,
        false
      );

      // Should schedule workflow notifications
      expect(scheduleWorkflowNotifications).toHaveBeenCalled();
    });

    test("should mark workflow step as verified when no reminder body", async () => {
      // Set IFFY_API_KEY to test the Iffy path
      process.env.IFFY_API_KEY = "test-api-key";

      const user = await prismock.user.create({
        data: {
          id: 2,
          email: "test2@example.com",
          locale: "en",
          timeFormat: 12,
          whitelistWorkflows: false,
        },
      });

      const workflow = await prismock.workflow.create({
        data: {
          id: 2,
          name: "Test Workflow 2",
          userId: user.id,
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
      });

      await prismock.workflowStep.create({
        data: {
          id: 201,
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          reminderBody: null, // No reminder body
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          id: 2,
          title: "Test Event 2",
          slug: "test-event-2",
          length: 30,
          userId: user.id,
        },
      });

      await prismock.workflowsOnEventTypes.create({
        data: {
          workflowId: workflow.id,
          eventTypeId: eventType.id,
        },
      });

      const payload = JSON.stringify({
        userId: 2,
        workflowStepId: 201,
      });

      await scanWorkflowBody(payload);

      // Should mark as verified
      const updatedStep = await prismock.workflowStep.findUnique({
        where: { id: 201 },
      });
      expect(updatedStep?.verifiedAt).toBeTruthy();
    });

    test("should mark workflow step as verified when body matches template", async () => {
      process.env.IFFY_API_KEY = "test-api-key";
      vi.mocked(compareReminderBodyToTemplate).mockReturnValueOnce(true);

      const user = await prismock.user.create({
        data: {
          id: 3,
          email: "test3@example.com",
          locale: "en",
          timeFormat: 12,
          whitelistWorkflows: false,
        },
      });

      const workflow = await prismock.workflow.create({
        data: {
          id: 3,
          name: "Test Workflow 3",
          userId: user.id,
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
      });

      await prismock.workflowStep.create({
        data: {
          id: 202,
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          reminderBody: "Default template body",
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          id: 3,
          title: "Test Event 3",
          slug: "test-event-3",
          length: 30,
          userId: user.id,
        },
      });

      await prismock.workflowsOnEventTypes.create({
        data: {
          workflowId: workflow.id,
          eventTypeId: eventType.id,
        },
      });

      const payload = JSON.stringify({
        userId: 3,
        workflowStepId: 202,
      });

      await scanWorkflowBody(payload);

      // Should mark as verified since body matches template
      const updatedStep = await prismock.workflowStep.findUnique({
        where: { id: 202 },
      });
      expect(updatedStep?.verifiedAt).toBeTruthy();
    });

    test("should skip processing when newer task exists", async () => {
      vi.mocked(Task.hasNewerScanTaskForStepId).mockResolvedValueOnce(true);

      const payload = JSON.stringify({
        userId: 1,
        workflowStepId: 999,
        createdAt: new Date().toISOString(),
      });

      await scanWorkflowBody(payload);

      // Should not submit for URL scanning
      expect(submitWorkflowStepForUrlScanning).not.toHaveBeenCalled();
    });

    test("should handle deprecated workflowStepIds array", async () => {
      const user = await prismock.user.create({
        data: {
          id: 4,
          email: "test4@example.com",
          locale: "en",
          timeFormat: 12,
          whitelistWorkflows: false,
        },
      });

      const workflow = await prismock.workflow.create({
        data: {
          id: 4,
          name: "Test Workflow 4",
          userId: user.id,
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
      });

      await prismock.workflowStep.create({
        data: {
          id: 203,
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          reminderBody: '<p>Hello <a href="https://test.com">link</a></p>',
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          id: 4,
          title: "Test Event 4",
          slug: "test-event-4",
          length: 30,
          userId: user.id,
        },
      });

      await prismock.workflowsOnEventTypes.create({
        data: {
          workflowId: workflow.id,
          eventTypeId: eventType.id,
        },
      });

      const payload = JSON.stringify({
        userId: 4,
        workflowStepIds: [203], // Using deprecated array format
      });

      await scanWorkflowBody(payload);

      // Should submit for URL scanning
      expect(submitWorkflowStepForUrlScanning).toHaveBeenCalled();
    });
  });

  describe("unhappy paths", () => {
    test("should return early when no step IDs provided", async () => {
      const payload = JSON.stringify({
        userId: 1,
      });

      await scanWorkflowBody(payload);

      // Should not submit for URL scanning
      expect(submitWorkflowStepForUrlScanning).not.toHaveBeenCalled();
      expect(scheduleWorkflowNotifications).not.toHaveBeenCalled();
    });

    test("should return early when workflow not found after processing steps", async () => {
      // This test verifies that the function returns early when the workflow
      // associated with the step IDs is not found (after the initial step processing)
      // Note: In practice, this scenario is rare since workflow steps are always
      // associated with a workflow, but the code handles it gracefully by logging
      // a warning and returning early.

      const payload = JSON.stringify({
        userId: 5,
        workflowStepIds: [999], // Non-existent step IDs
      });

      // Should not throw - the function returns early when no steps are found
      await expect(scanWorkflowBody(payload)).resolves.not.toThrow();

      // Should not schedule notifications since no workflow was found
      expect(scheduleWorkflowNotifications).not.toHaveBeenCalled();
    });

    test("should pass whitelistWorkflows flag when user is whitelisted", async () => {
      const user = await prismock.user.create({
        data: {
          id: 6,
          email: "test6@example.com",
          locale: "en",
          timeFormat: 12,
          whitelistWorkflows: true, // Whitelisted user
        },
      });

      const workflow = await prismock.workflow.create({
        data: {
          id: 6,
          name: "Test Workflow 6",
          userId: user.id,
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 1,
          timeUnit: TimeUnit.HOUR,
        },
      });

      await prismock.workflowStep.create({
        data: {
          id: 205,
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          reminderBody: '<p>Hello <a href="https://example.com">link</a></p>',
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          id: 6,
          title: "Test Event 6",
          slug: "test-event-6",
          length: 30,
          userId: user.id,
        },
      });

      await prismock.workflowsOnEventTypes.create({
        data: {
          workflowId: workflow.id,
          eventTypeId: eventType.id,
        },
      });

      const payload = JSON.stringify({
        userId: 6,
        workflowStepId: 205,
      });

      await scanWorkflowBody(payload);

      // Should pass whitelistWorkflows=true
      expect(submitWorkflowStepForUrlScanning).toHaveBeenCalledWith(205, expect.any(String), 6, true);
    });
  });

  describe("iffyScanBody", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test("should return flagged status from Iffy API", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ flagged: true }),
      });
      vi.stubGlobal("fetch", mockFetch);

      process.env.IFFY_API_KEY = "test-api-key";

      const result = await iffyScanBody("spam content", 100);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.iffy.com/api/v1/moderate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
          }),
          body: expect.stringContaining("spam content"),
        })
      );
    });

    test("should return false when content is not flagged", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ flagged: false }),
      });
      vi.stubGlobal("fetch", mockFetch);

      process.env.IFFY_API_KEY = "test-api-key";

      const result = await iffyScanBody("normal content", 100);

      expect(result).toBe(false);
    });

    test("should handle API errors gracefully", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("API error"));
      vi.stubGlobal("fetch", mockFetch);

      process.env.IFFY_API_KEY = "test-api-key";

      const result = await iffyScanBody("content", 100);

      // Should return undefined on error (fail-open)
      expect(result).toBeUndefined();
    });
  });
});
