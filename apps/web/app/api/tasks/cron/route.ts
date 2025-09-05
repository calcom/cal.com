import { GET as handler } from "@calcom/features/tasker/api/cron";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const GET = defaultResponderForAppDir(handler);

/**
 * This runs each minute and we need fresh data each time
 * @see https://nextjs.org/docs/app/building-your-application/caching#opting-out-2
 **/
export const revalidate = 0;
