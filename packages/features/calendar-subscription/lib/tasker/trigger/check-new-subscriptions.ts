import { schemaTask } from "@trigger.dev/sdk";

import { calendarSubscriptionTaskConfig } from "./config";
import { calendarSubscriptionRolloutSchema } from "./schema";

export const CHECK_CALENDAR_SUBSCRIPTIONS_JOB_ID = "calendar-subscription.check-new-watches";

export const checkForNewCalendarSubscriptions = schemaTask({
  id: CHECK_CALENDAR_SUBSCRIPTIONS_JOB_ID,
  ...calendarSubscriptionTaskConfig,
  schema: calendarSubscriptionRolloutSchema,
  run: async () => {
    const { runCalendarSubscriptionRollout } = await import(
      "@calcom/features/calendar-subscription/lib/runCalendarSubscriptionRollout"
    );
    await runCalendarSubscriptionRollout();
  },
});
