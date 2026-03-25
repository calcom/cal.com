import type { WorkflowStatus } from "@calcom/prisma/enums";

export function parseUtcTimestamp(input: string | Date): number {
  if (input instanceof Date) {
    return input.getTime();
  }

  // If timezone is missing, force UTC
  return Date.parse(!/[zZ]|[+-]\d\d:\d\d$/.test(input) ? `${input}Z` : input);
}

export function resolveWorkflowStepStatus(
  workflowInsight: {
    status: WorkflowStatus;
  } | null,
  workflowReminder: {
    cancelled: boolean | null;
    providerCancellationStatus: string | null;
    scheduled: boolean;
    scheduledDate: Date;
  } | null
): WorkflowStatus {
  if (!workflowReminder) {
    return workflowInsight?.status ?? "QUEUED";
  }

  const { cancelled, providerCancellationStatus, scheduled, scheduledDate } = workflowReminder;

  const isProviderCancelled =
    cancelled && (providerCancellationStatus === "pending" || providerCancellationStatus === "cancelled");

  if (isProviderCancelled) {
    return "CANCELLED";
  }

  if (workflowInsight) {
    return workflowInsight.status;
  }

  if (cancelled) {
    return "CANCELLED";
  }

  if (!scheduled) {
    return "QUEUED";
  }

  return parseUtcTimestamp(scheduledDate) <= Date.now() ? "DELIVERED" : "QUEUED";
}
