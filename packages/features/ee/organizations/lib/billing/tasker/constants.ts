export const INCREMENT_USAGE_JOB_ID = "platform.billing.increment-usage";
export const RESCHEDULE_USAGE_INCREMENT_JOB_ID = "platform.billing.reschedule-usage-increment";
export const CANCEL_USAGE_INCREMENT_JOB_ID = "platform.billing.cancel-usage-increment";
export const COUNT_ACTIVE_MANAGED_USERS_JOB_ID = "platform.billing.count-active-managed-users";
export const INVOICE_ACTIVE_MANAGED_USERS_JOB_ID = "platform.billing.invoice-active-managed-users";
export const CRON_COUNT_ACTIVE_MANAGED_USERS_JOB_ID = "platform.billing.cron-count-active-managed-users";
const INCREMENT_USAGE_JOB_TAG = "platform.billing.usage.";
export const getIncrementUsageJobTag = (bookingUid: string): string =>
  `${INCREMENT_USAGE_JOB_TAG}${bookingUid}`;
const INCREMENT_USAGE_IDEMPOTENCY_KEY = `platform.billing.usage.`;
export const getIncrementUsageIdempotencyKey = (bookingUid: string, userId: number): string =>
  `${INCREMENT_USAGE_IDEMPOTENCY_KEY}${bookingUid}-${userId}`;
