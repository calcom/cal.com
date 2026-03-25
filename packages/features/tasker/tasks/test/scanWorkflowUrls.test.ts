import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, test, vi, beforeEach } from "vitest";

import tasker from "@calcom/features/tasker";

import {
  scanWorkflowUrls,
  submitWorkflowStepForUrlScanning,
  submitUrlForUrlScanning,
} from "../scanWorkflowUrls";

// Mock the urlScanner module
vi.mock("@calcom/features/ee/workflows/lib/urlScanner", () => ({
  extractUrlsFromHtml: vi.fn((html: string) => {
    // Simple mock implementation
    const urls: string[] = [];
    const hrefRegex = /href=["']([^"']+)["']/gi;
    for (const match of Array.from(html.matchAll(hrefRegex))) {
      const url = match[1];
      if (url.startsWith("http://") || url.startsWith("https://")) {
        urls.push(url);
      }
    }
    return urls;
  }),
  submitUrlForScanning: vi.fn().mockResolvedValue({ scanId: "mock-scan-id" }),
  getScanResult: vi.fn().mockResolvedValue({
    url: "https://example.com",
    scanId: "mock-scan-id",
    status: "completed",
    malicious: false,
    categories: [],
  }),
  isUrlScanningEnabled: vi.fn().mockReturnValue(true),
}));

// Mock the tasker
vi.mock("@calcom/features/tasker", () => ({
  default: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the autoLock module
vi.mock("@calcom/features/ee/api-keys/lib/autoLock", () => ({
  LockReason: {
    MALICIOUS_URL_IN_WORKFLOW: "MALICIOUS_URL_IN_WORKFLOW",
  },
  lockUser: vi.fn().mockResolvedValue(undefined),
}));

// Import mocked modules for assertions
import * as urlScanner from "@calcom/features/ee/workflows/lib/urlScanner";
import { lockUser } from "@calcom/features/ee/api-keys/lib/autoLock";

describe("scanWorkflowUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scanWorkflowUrls task handler", () => {
    describe("happy paths", () => {
      test("should skip scanning when URL scanning is disabled", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValueOnce(false);

        // Create a workflow step in prismock first
        await prismock.workflowStep.create({
          data: {
            id: 100,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          urls: ["https://example.com"],
        });

        await scanWorkflowUrls(payload);

        // Should mark workflow step as verified
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 100 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
        expect(urlScanner.submitUrlForScanning).not.toHaveBeenCalled();
      });

      test("should submit URLs for scanning in phase 1", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.submitUrlForScanning).mockResolvedValue({ scanId: "scan-123" });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          urls: ["https://example.com", "https://another.com"],
        });

        await scanWorkflowUrls(payload);

        expect(urlScanner.submitUrlForScanning).toHaveBeenCalledTimes(2);
        expect(urlScanner.submitUrlForScanning).toHaveBeenCalledWith("https://example.com");
        expect(urlScanner.submitUrlForScanning).toHaveBeenCalledWith("https://another.com");

        // Should schedule follow-up task
        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            userId: 1,
            workflowStepId: 100,
            pendingScans: expect.arrayContaining([
              expect.objectContaining({ url: "https://example.com", scanId: "scan-123" }),
            ]),
            pollAttempts: 0,
          }),
          expect.objectContaining({ scheduledAt: expect.any(Date) })
        );
      });

      test("should poll for scan results in phase 2 and mark as verified when clean", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.getScanResult).mockResolvedValue({
          url: "https://example.com",
          scanId: "scan-123",
          status: "completed",
          malicious: false,
          categories: [],
        });

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 100,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          pendingScans: [{ url: "https://example.com", scanId: "scan-123" }],
          pollAttempts: 0,
        });

        await scanWorkflowUrls(payload);

        expect(urlScanner.getScanResult).toHaveBeenCalledWith("scan-123");

        // Should mark workflow step as verified
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 100 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
      });
    });

    describe("unhappy paths", () => {
      test("should lock user when malicious URL is detected", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.getScanResult).mockResolvedValue({
          url: "https://malicious.com",
          scanId: "scan-123",
          status: "completed",
          malicious: true,
          categories: ["phishing"],
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          pendingScans: [{ url: "https://malicious.com", scanId: "scan-123" }],
          pollAttempts: 0,
        });

        await scanWorkflowUrls(payload);

        expect(lockUser).toHaveBeenCalledWith("userId", "1", "MALICIOUS_URL_IN_WORKFLOW");
      });

      test("should not lock whitelisted user when malicious URL is detected", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.getScanResult).mockResolvedValue({
          url: "https://malicious.com",
          scanId: "scan-123",
          status: "completed",
          malicious: true,
          categories: ["phishing"],
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          pendingScans: [{ url: "https://malicious.com", scanId: "scan-123" }],
          pollAttempts: 0,
          whitelistWorkflows: true,
        });

        await scanWorkflowUrls(payload);

        expect(lockUser).not.toHaveBeenCalled();
      });

      test("should mark as verified when max poll attempts reached (fail-open)", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 101,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 101,
          pendingScans: [{ url: "https://example.com", scanId: "scan-123" }],
          pollAttempts: 10, // MAX_POLL_ATTEMPTS
        });

        await scanWorkflowUrls(payload);

        // Should mark workflow step as verified (fail-open)
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 101 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
      });

      test("should mark as verified when all URL submissions fail (fail-open)", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.submitUrlForScanning).mockResolvedValue({ error: "API error" });

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 102,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 102,
          urls: ["https://example.com"],
        });

        await scanWorkflowUrls(payload);

        // Should mark workflow step as verified (fail-open)
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 102 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
      });

      test("should schedule another poll when scan is still pending", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.getScanResult).mockResolvedValue(null); // Still pending

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 100,
          pendingScans: [{ url: "https://example.com", scanId: "scan-123" }],
          pollAttempts: 0,
        });

        await scanWorkflowUrls(payload);

        // Should schedule another poll
        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            userId: 1,
            workflowStepId: 100,
            pendingScans: [{ url: "https://example.com", scanId: "scan-123" }],
            pollAttempts: 1,
          }),
          expect.objectContaining({ scheduledAt: expect.any(Date) })
        );
      });

      test("should treat scan errors as non-malicious (fail-open)", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.getScanResult).mockResolvedValue({
          url: "https://example.com",
          scanId: "scan-123",
          status: "error",
          error: "Scan failed",
        });

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 103,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        const payload = JSON.stringify({
          userId: 1,
          workflowStepId: 103,
          pendingScans: [{ url: "https://example.com", scanId: "scan-123" }],
          pollAttempts: 0,
        });

        await scanWorkflowUrls(payload);

        // Should mark workflow step as verified (fail-open for errors)
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 103 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
      });
    });
  });

  describe("submitWorkflowStepForUrlScanning", () => {
    describe("happy paths", () => {
      test("should create task when URLs are found in reminder body", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.extractUrlsFromHtml).mockReturnValue(["https://example.com"]);

        await submitWorkflowStepForUrlScanning(100, '<a href="https://example.com">Link</a>', 1, false);

        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            userId: 1,
            workflowStepId: 100,
            urls: ["https://example.com"],
            whitelistWorkflows: false,
          })
        );
      });

      test("should pass whitelistWorkflows parameter", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.extractUrlsFromHtml).mockReturnValue(["https://example.com"]);

        await submitWorkflowStepForUrlScanning(100, '<a href="https://example.com">Link</a>', 1, true);

        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            whitelistWorkflows: true,
          })
        );
      });
    });

    describe("unhappy paths", () => {
      test("should mark as verified when URL scanning is disabled", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(false);

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 104,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        await submitWorkflowStepForUrlScanning(104, '<a href="https://example.com">Link</a>', 1, false);

        // Should mark workflow step as verified
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 104 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
        expect(tasker.create).not.toHaveBeenCalled();
      });

      test("should mark as verified when no URLs are found", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);
        vi.mocked(urlScanner.extractUrlsFromHtml).mockReturnValue([]);

        // Create a workflow step in prismock
        await prismock.workflowStep.create({
          data: {
            id: 105,
            stepNumber: 1,
            action: "EMAIL_HOST",
            template: "REMINDER",
            workflowId: 1,
          },
        });

        await submitWorkflowStepForUrlScanning(105, "<p>No links here</p>", 1, false);

        // Should mark workflow step as verified
        const workflowStep = await prismock.workflowStep.findUnique({
          where: { id: 105 },
        });
        expect(workflowStep?.verifiedAt).toBeTruthy();
        expect(tasker.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("submitUrlForUrlScanning", () => {
    describe("happy paths", () => {
      test("should create task for event type redirect URL", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);

        await submitUrlForUrlScanning("https://redirect.com", 1, 50, false);

        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            userId: 1,
            eventTypeId: 50,
            urls: ["https://redirect.com"],
            whitelistWorkflows: false,
          })
        );
      });

      test("should pass whitelistWorkflows parameter", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(true);

        await submitUrlForUrlScanning("https://redirect.com", 1, 50, true);

        expect(tasker.create).toHaveBeenCalledWith(
          "scanWorkflowUrls",
          expect.objectContaining({
            whitelistWorkflows: true,
          })
        );
      });
    });

    describe("unhappy paths", () => {
      test("should skip when URL scanning is disabled", async () => {
        vi.mocked(urlScanner.isUrlScanningEnabled).mockReturnValue(false);

        await submitUrlForUrlScanning("https://redirect.com", 1, 50, false);

        expect(tasker.create).not.toHaveBeenCalled();
      });
    });
  });
});
