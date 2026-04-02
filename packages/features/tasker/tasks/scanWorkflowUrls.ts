import { LockReason, lockUser } from "@calcom/features/ee/api-keys/lib/autoLock";
import {
  extractUrlsFromHtml,
  getScanResult,
  isUrlScanningEnabled,
  submitUrlForScanning,
} from "@calcom/features/ee/workflows/lib/urlScanner";
import tasker from "@calcom/features/tasker";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import z from "zod";

export const scanWorkflowUrlsSchema = z.object({
  userId: z.number(),
  workflowStepId: z.number().optional(),
  eventTypeId: z.number().optional(),
  // URLs to scan (extracted from workflow body or event type redirect URL)
  urls: z.array(z.string()).optional(),
  // Scan IDs from Cloudflare (for polling results)
  pendingScans: z
    .array(
      z.object({
        url: z.string(),
        scanId: z.string(),
      })
    )
    .optional(),
  // Number of poll attempts made
  pollAttempts: z.number().optional(),
  createdAt: z.string().optional(),
  whitelistWorkflows: z.boolean().optional(),
});

const log = logger.getSubLogger({ prefix: ["[tasker] scanWorkflowUrls"] });

/**
 * Sanitizes a URL for logging by removing query parameters that may contain sensitive data.
 */
function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    // biome-ignore lint/nursery/noTernary: Simple ternary for conditional suffix
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search ? "[query_params_redacted]" : ""}`;
  } catch {
    return "[invalid_url]";
  }
}

const MAX_POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 15000; // 15 seconds

export async function scanWorkflowUrls(payload: string) {
  const parsed = scanWorkflowUrlsSchema.parse(JSON.parse(payload));
  const {
    userId,
    workflowStepId,
    eventTypeId,
    urls,
    pendingScans,
    pollAttempts = 0,
    whitelistWorkflows,
  } = parsed;

  if (!isUrlScanningEnabled()) {
    log.info("URL scanning is not enabled, skipping");
    // Mark workflow step as verified if this was for a workflow
    if (workflowStepId) {
      await markWorkflowStepVerified(workflowStepId);
    }
    return;
  }

  // Phase 1: Submit URLs for scanning
  if (urls && urls.length > 0 && !pendingScans) {
    log.info(`Submitting ${urls.length} URLs for scanning`, { userId, workflowStepId, eventTypeId });

    const newPendingScans: Array<{ url: string; scanId: string }> = [];
    const failedUrls: string[] = [];

    for (const url of urls) {
      const result = await submitUrlForScanning(url);
      if ("error" in result) {
        log.error(`Failed to submit URL for scanning: ${result.error}`, { url: sanitizeUrlForLogging(url) });
        failedUrls.push(url);
      } else {
        newPendingScans.push({ url, scanId: result.scanId });
      }
    }

    if (newPendingScans.length === 0) {
      // All submissions failed, mark as verified (fail-open for submission errors)
      log.warn("All URL submissions failed, marking as verified", { userId, workflowStepId, eventTypeId });
      if (workflowStepId) {
        await markWorkflowStepVerified(workflowStepId);
      }
      return;
    }

    // Schedule follow-up task to poll for results
    const scheduledAt = new Date(Date.now() + POLL_DELAY_MS);
    await tasker.create(
      "scanWorkflowUrls",
      {
        userId,
        workflowStepId,
        eventTypeId,
        pendingScans: newPendingScans,
        pollAttempts: 0,
        whitelistWorkflows,
      },
      { scheduledAt }
    );

    return;
  }

  // Phase 2: Poll for scan results
  if (pendingScans && pendingScans.length > 0) {
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      log.warn("Max poll attempts reached, marking as verified", {
        userId,
        workflowStepId,
        eventTypeId,
        pendingScans,
      });
      // Fail-open: mark as verified if we can't get results
      if (workflowStepId) {
        await markWorkflowStepVerified(workflowStepId);
      }
      return;
    }

    const stillPending: Array<{ url: string; scanId: string }> = [];
    const maliciousUrls: string[] = [];

    for (const { url, scanId } of pendingScans) {
      const result = await getScanResult(scanId);

      if (result === null) {
        // Still pending
        stillPending.push({ url, scanId });
      } else if (result.status === "error") {
        log.error(`Error getting scan result: ${result.error}`, { url: sanitizeUrlForLogging(url), scanId });
        // Don't add to stillPending, treat as non-malicious (fail-open for errors)
      } else if (result.malicious) {
        maliciousUrls.push(url);
        log.warn(`Malicious URL detected`, {
          url: sanitizeUrlForLogging(url),
          scanId,
          categories: result.categories,
          userId,
          workflowStepId,
          eventTypeId,
        });
      }
    }

    // If malicious URLs found, lock the user (unless whitelisted)
    if (maliciousUrls.length > 0) {
      if (whitelistWorkflows) {
        log.warn(`Skipping lock for whitelisted user with malicious URLs`, {
          userId,
          maliciousUrlCount: maliciousUrls.length,
          workflowStepId,
          eventTypeId,
        });
      } else {
        log.warn(`Locking user due to malicious URLs`, {
          userId,
          maliciousUrlCount: maliciousUrls.length,
          workflowStepId,
          eventTypeId,
        });
        await lockUser("userId", String(userId), LockReason.MALICIOUS_URL_IN_WORKFLOW);
      }
      // Don't mark as verified - the workflow step should not be sent
      return;
    }

    // If still pending, schedule another poll
    if (stillPending.length > 0) {
      const scheduledAt = new Date(Date.now() + POLL_DELAY_MS);
      await tasker.create(
        "scanWorkflowUrls",
        {
          userId,
          workflowStepId,
          eventTypeId,
          pendingScans: stillPending,
          pollAttempts: pollAttempts + 1,
          whitelistWorkflows,
        },
        { scheduledAt }
      );
      return;
    }

    // All scans completed and no malicious URLs found
    log.info("All URL scans completed, no malicious URLs found", { userId, workflowStepId, eventTypeId });
    if (workflowStepId) {
      await markWorkflowStepVerified(workflowStepId);
    }
  }
}

async function markWorkflowStepVerified(workflowStepId: number) {
  await prisma.workflowStep.update({
    where: { id: workflowStepId },
    data: { verifiedAt: new Date() },
  });
  log.info(`Marked workflow step as verified`, { workflowStepId });
}

/**
 * Helper function to extract URLs from workflow step body and submit for scanning.
 * Called from scanWorkflowBody task or directly from workflow update handler.
 */
export async function submitWorkflowStepForUrlScanning(
  workflowStepId: number,
  reminderBody: string,
  userId: number,
  whitelistWorkflows?: boolean
): Promise<void> {
  if (!isUrlScanningEnabled()) {
    // URL scanning is disabled, mark as verified since there's nothing to scan
    await markWorkflowStepVerified(workflowStepId);
    return;
  }

  const urls = extractUrlsFromHtml(reminderBody);
  if (urls.length === 0) {
    // No URLs found, mark as verified since there's nothing to scan
    log.info("No URLs found in workflow step body, marking as verified", { workflowStepId });
    await markWorkflowStepVerified(workflowStepId);
    return;
  }

  log.info(`Found ${urls.length} URLs in workflow step body, submitting for scanning`, {
    workflowStepId,
    urlCount: urls.length,
  });

  await tasker.create("scanWorkflowUrls", {
    userId,
    workflowStepId,
    urls,
    whitelistWorkflows,
  });
}

/**
 * Helper function to scan a single URL (e.g., event type redirect URL).
 */
export async function submitUrlForUrlScanning(
  url: string,
  userId: number,
  eventTypeId: number,
  whitelistWorkflows?: boolean
): Promise<void> {
  if (!isUrlScanningEnabled()) {
    return;
  }

  log.info(`Submitting event type redirect URL for scanning`, {
    url: sanitizeUrlForLogging(url),
    userId,
    eventTypeId,
  });

  await tasker.create("scanWorkflowUrls", {
    userId,
    eventTypeId,
    urls: [url],
    whitelistWorkflows,
  });
}
