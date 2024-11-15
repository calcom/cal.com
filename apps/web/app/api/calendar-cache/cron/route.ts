export { GET } from "@calcom/features/calendar-cache/api/cron";

/**
 * This runs each minute and we need fresh data each time
 * @see https://nextjs.org/docs/app/building-your-application/caching#opting-out-2
 **/
export const revalidate = 0;
