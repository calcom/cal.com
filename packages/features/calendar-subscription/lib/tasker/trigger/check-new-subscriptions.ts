import { schedules } from "@trigger.dev/sdk";

import { calendarSubscriptionTaskConfig } from "./config";

export const CHECK_CALENDAR_SUBSCRIPTIONS_JOB_ID = "calendar-subscription.check-new-watches";

export const checkForNewCalendarSubscriptions = schedules.task({
  id: CHECK_CALENDAR_SUBSCRIPTIONS_JOB_ID,
  ...calendarSubscriptionTaskConfig,
  cron: "*/5 * * * *",
  run: async () => {
    const { runCalendarSubscriptionRollout } = await import(
      "@calcom/features/calendar-subscription/lib/runCalendarSubscriptionRollout"
    );
    await runCalendarSubscriptionRollout();
  },
});
