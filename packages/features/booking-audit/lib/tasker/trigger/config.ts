import { queue } from "@trigger.dev/sdk";

export const bookingAuditQueue = queue({
  name: "booking-audit",
  concurrencyLimit: 15,
});

export const bookingAuditTaskConfig = {
  // The task simply writes to DB and loads minimal dependencies, so we can use a small machine
  machine: "small-1x" as const,
  queue: bookingAuditQueue,
  retry: {
    maxAttempts: 20,
    // Exponential backoff multiplier applied to retry delay
    factor: 2,
    // Minimum retry delay between attempts (exponential backoff lower bound)
    minTimeoutInMs: 60000, // 1 minute
    // Maximum retry delay between attempts (exponential backoff upper bound)
    maxTimeoutInMs: 7200000, // 2 hours
    // Randomize the retry delay to avoid thundering herd effect
    randomize: true,
    // Retry schedule (worst case without randomization):
    //   Attempt  1 → 2:   1 min
    //   Attempt  2 → 3:   2 min
    //   Attempt  3 → 4:   4 min
    //   Attempt  4 → 5:   8 min
    //   Attempt  5 → 6:  16 min
    //   Attempt  6 → 7:  32 min
    //   Attempt  7 → 8:  64 min
    //   Attempt  8 → 9:   2 hrs (capped)
    //   Attempt  9 → 20:  2 hrs each (11 intervals)
    //   Total retry window: ~26 hours
    //
    // Audit records should not be silently lost, so we retry aggressively
    // over a 24+ hour window to survive major outages.
    outOfMemory: {
      // If the task runs out of memory, we can upgrade to a larger machine
      machine: "small-2x" as const,
    },
  },
};
