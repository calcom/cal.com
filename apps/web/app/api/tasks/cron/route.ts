export { GET } from "@calcom/features/tasker/api/cron";

/** This runs each minute and we need fresh data each time */
export const revalidate = 0;
