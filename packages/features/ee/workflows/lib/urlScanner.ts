import { LockReason, lockUser } from "@calcom/features/ee/api-keys/lib/autoLock";
import { URL_SCANNING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

// biome-ignore lint/nursery/useExplicitType: Logger type is inferred from getSubLogger
const log = logger.getSubLogger({ prefix: ["[urlScanner]"] });

// Cloudflare URL Scanner API configuration
const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 15000; // 15 seconds

interface CloudflareScanSubmitResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    uuid: string;
    url: string;
    visibility: string;
  };
}

interface CloudflareScanResultResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    scan: {
      task: {
        uuid: string;
        url: string;
        status: string;
        success: boolean;
      };
      verdicts: {
        overall: {
          malicious: boolean;
          categories: string[];
        };
      };
    };
  };
}

interface UrlScanResult {
  url: string;
  scanId: string;
  status: "pending" | "completed" | "error";
  malicious?: boolean;
  categories?: string[];
  error?: string;
}

/**
 * Gets the error message from an unknown error.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

/**
 * Creates an error result for a scan.
 */
function createErrorResult(scanId: string, errorMessage: string): UrlScanResult {
  return {
    url: "",
    scanId,
    status: "error",
    error: errorMessage,
  };
}

/**
 * Validates that a URL is a valid HTTP/HTTPS URL.
 */
function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL for deduplication.
 */
function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove trailing slash from pathname if it's just "/"
    if (url.pathname === "/") {
      url.pathname = "";
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * Extracts URLs from HTML content.
 * Extracts both href attributes from anchor tags and bare URLs from text.
 */
function extractUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();

  // Extract href attributes from anchor tags
  const hrefRegex = /href=["']([^"']+)["']/gi;
  for (const match of Array.from(html.matchAll(hrefRegex))) {
    const url = match[1];
    if (isValidHttpUrl(url)) {
      urls.add(normalizeUrl(url));
    }
  }

  // Extract bare URLs from text content
  const bareUrlRegex = /https?:\/\/[^\s<>"']+/gi;
  for (const match of Array.from(html.matchAll(bareUrlRegex))) {
    const url = match[0];
    // Clean up trailing punctuation that might have been captured
    const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
    if (isValidHttpUrl(cleanUrl)) {
      urls.add(normalizeUrl(cleanUrl));
    }
  }

  return Array.from(urls);
}

/**
 * Submits a URL to Cloudflare URL Scanner for scanning.
 */
async function submitUrlForScanning(url: string): Promise<{ scanId: string } | { error: string }> {
  // biome-ignore lint/style/noProcessEnv lint/correctness/noProcessGlobal: Server-side only, credentials from env
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  // biome-ignore lint/style/noProcessEnv lint/correctness/noProcessGlobal: Server-side only, credentials from env
  const apiToken = process.env.CLOUDFLARE_URL_SCANNER_API_TOKEN;

  if (!accountId || !apiToken) {
    return { error: "Cloudflare URL Scanner credentials not configured" };
  }

  try {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts/${accountId}/urlscanner/v2/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        visibility: "Unlisted", // Don't make scans public
      }),
    });

    const data = (await response.json()) as CloudflareScanSubmitResponse;

    if (!data.success || !data.result?.uuid) {
      const errorMessage = data.errors?.[0]?.message || "Unknown error submitting URL for scanning";
      log.error(`Failed to submit URL for scanning: ${errorMessage}`, { url });
      return { error: errorMessage };
    }

    log.info(`Submitted URL for scanning`, { url, scanId: data.result.uuid });
    return { scanId: data.result.uuid };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log.error(`Error submitting URL for scanning: ${errorMessage}`, { url });
    return { error: errorMessage };
  }
}

/**
 * Parses the scan result response from Cloudflare API.
 */
function parseScanResultResponse(scanId: string, data: CloudflareScanResultResponse): UrlScanResult {
  if (!data.success || !data.result?.scan) {
    const errorMessage = data.errors?.[0]?.message || "Unknown error getting scan result";
    return createErrorResult(scanId, errorMessage);
  }

  const { task, verdicts } = data.result.scan;

  return {
    url: task.url,
    scanId,
    status: "completed",
    malicious: verdicts.overall.malicious,
    categories: verdicts.overall.categories,
  };
}

/**
 * Gets the result of a URL scan from Cloudflare.
 * Returns null if the scan is still in progress.
 */
async function getScanResult(scanId: string): Promise<UrlScanResult | null> {
  // biome-ignore lint/style/noProcessEnv lint/correctness/noProcessGlobal: Server-side only, credentials from env
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  // biome-ignore lint/style/noProcessEnv lint/correctness/noProcessGlobal: Server-side only, credentials from env
  const apiToken = process.env.CLOUDFLARE_URL_SCANNER_API_TOKEN;

  if (!accountId || !apiToken) {
    return createErrorResult(scanId, "Cloudflare URL Scanner credentials not configured");
  }

  try {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts/${accountId}/urlscanner/v2/result/${scanId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    // 404 means scan is still in progress
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Error getting scan result: ${response.status} ${errorText}`, { scanId });
      return createErrorResult(scanId, `HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as CloudflareScanResultResponse;
    return parseScanResultResponse(scanId, data);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log.error(`Error getting scan result: ${errorMessage}`, { scanId });
    return createErrorResult(scanId, errorMessage);
  }
}

/**
 * Scans multiple URLs and returns results.
 * This is a synchronous scan that polls for results.
 * For async scanning, use submitUrlForScanning and getScanResult separately.
 */
async function scanUrls(urls: string[]): Promise<UrlScanResult[]> {
  if (!URL_SCANNING_ENABLED || urls.length === 0) {
    return [];
  }

  const results: UrlScanResult[] = [];
  const pendingScans: Map<string, { url: string; attempts: number }> = new Map();

  // Submit all URLs for scanning
  for (const url of urls) {
    const submitResult = await submitUrlForScanning(url);
    if ("error" in submitResult) {
      results.push({
        url,
        scanId: "",
        status: "error",
        error: submitResult.error,
      });
    } else {
      pendingScans.set(submitResult.scanId, { url, attempts: 0 });
    }
  }

  // Poll for results
  while (pendingScans.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    for (const [scanId, { url, attempts }] of Array.from(pendingScans.entries())) {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        results.push({
          url,
          scanId,
          status: "error",
          error: "Max poll attempts reached",
        });
        pendingScans.delete(scanId);
        continue;
      }

      const result = await getScanResult(scanId);
      if (result === null) {
        // Still pending
        pendingScans.set(scanId, { url, attempts: attempts + 1 });
      } else {
        results.push(result);
        pendingScans.delete(scanId);
      }
    }
  }

  return results;
}

/**
 * Checks if any URLs are malicious and locks the user if so.
 * Returns true if malicious URLs were found and user was locked.
 */
async function checkUrlsAndLockIfMalicious(
  urls: string[],
  userId: number,
  context: { workflowStepId?: number; eventTypeId?: number; whitelistWorkflows?: boolean }
): Promise<{ maliciousUrls: string[]; locked: boolean }> {
  if (!URL_SCANNING_ENABLED || urls.length === 0) {
    return { maliciousUrls: [], locked: false };
  }

  const results = await scanUrls(urls);
  const maliciousUrls = results.filter((r) => r.malicious).map((r) => r.url);

  if (maliciousUrls.length > 0) {
    log.warn(`Malicious URLs detected`, {
      userId,
      maliciousUrls,
      workflowStepId: context.workflowStepId,
      eventTypeId: context.eventTypeId,
    });

    // Don't lock whitelisted users
    if (context.whitelistWorkflows) {
      log.warn(`Skipping lock for whitelisted user`, { userId });
      return { maliciousUrls, locked: false };
    }

    // Lock the user
    await lockUser("userId", String(userId), LockReason.MALICIOUS_URL_IN_WORKFLOW);
    return { maliciousUrls, locked: true };
  }

  return { maliciousUrls: [], locked: false };
}

/**
 * Checks if URL scanning is enabled.
 */
function isUrlScanningEnabled(): boolean {
  return URL_SCANNING_ENABLED;
}

// Export all public functions and types at the end
export type { UrlScanResult };
export {
  extractUrlsFromHtml,
  submitUrlForScanning,
  getScanResult,
  scanUrls,
  checkUrlsAndLockIfMalicious,
  isUrlScanningEnabled,
};
