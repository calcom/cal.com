// Mock for @calcom/platform-libraries/tasker

export const CANCEL_USAGE_INCREMENT_JOB_ID = "cancel-usage-increment";
export const INCREMENT_USAGE_JOB_ID = "increment-usage";
export const RESCHEDULE_USAGE_INCREMENT_JOB_ID = "reschedule-usage-increment";
export const getIncrementUsageIdempotencyKey = jest.fn();
export const getIncrementUsageJobTag = jest.fn();
export const getTasker = jest.fn();
