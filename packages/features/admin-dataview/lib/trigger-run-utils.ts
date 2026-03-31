/** Statuses that indicate a failed run (eligible for replay). */
export const FAILED_STATUSES = new Set(["FAILED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT"]);

/** Status → Badge color mapping for Trigger.dev run statuses. */
export const STATUS_VARIANTS: Record<string, "green" | "red" | "orange" | "gray" | "blue"> = {
  COMPLETED: "green",
  EXECUTING: "blue",
  QUEUED: "gray",
  DEQUEUED: "gray",
  WAITING: "blue",
  DELAYED: "gray",
  PENDING_VERSION: "gray",
  FAILED: "red",
  CRASHED: "red",
  SYSTEM_FAILURE: "red",
  TIMED_OUT: "red",
  EXPIRED: "orange",
  CANCELED: "orange",
};

/**
 * Abbreviate long dot-separated task identifiers.
 * "webhook.deliver" → "webhook.deliver"
 * "booking.send.confirm.notifications" → "booking…confirm.notifications"
 */
export function shortTaskName(taskIdentifier: string): string {
  const parts = taskIdentifier.split(".");
  if (parts.length <= 3) return taskIdentifier;
  return `${parts[0]}…${parts.slice(-2).join(".")}`;
}

/** Format milliseconds into a human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

/** Format cents as a dollar amount, or "—" for zero. */
export function formatCost(cents: number): string {
  if (cents === 0) return "—";
  return `$${(cents / 100).toFixed(4)}`;
}

/** Format a date string for compact display, or "—" for null. */
export function formatRunDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
